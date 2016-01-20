# Motivation #

Following Release 11 of [the Epoch programming language](http://epoch-language.googlecode.com/), it became painfully clear that the compiler backing the Epoch project was problematically slow. First, the compilation model required parsing the raw source code up to four times for even trivial programs; second, string parsing was slow using boost::spirit::classic; third, dynamic memory allocations completely demolished the performance of the generation of the abstract syntax tree (AST).

As a point of reference, Era.epoch (the implementation of the prototype IDE for Epoch) compiles in approximately 30 seconds on the reference hardware. Compilation comprises three parsing passes, for an average of roughly 10 seconds per pass. This file is 20KB of source code and represents a fairly thorough cross-section of the Epoch syntax; i.e. it exercises the compiler quite nicely in terms of hitting all the various productions in the parser grammar.

Release 12 of Epoch centered on reimplementing the compiler to eliminate these performance problems.


# Approach #

The first stage of improving the compiler involved replacing boost::spirit::classic with boost::spirit::qi, a new and vastly improved version of the Spirit parser generator framework. Anecdotal evidence from qi users suggested that the new version offered substantial performance increases, even with minimal changes to the parser grammar and semantic action sets themselves.

The second prong of attack was to eliminate the redundant parsing passes and operate solely on AST nodes in memory, optionally generating new intermediate representations in successive compilation passes rather than ever revisiting the raw input text stream. For practical reasons, the transition to AST transforms (over redundant text parses) was performed largely in parallel with the other optimizations.

Next, a handful of readily available profilers were brought to bear on the resultant code, and used to isolate hotspots and target them for improvement.

Using this data, it became clear that major gains could be had by deploying boost::spirit::lex for lexical analysis on the input text. Moreover, some fundamental inefficiencies in the grammar itself were detected and addressed.


# Migrating to qi #

After converting the grammar to synthesize an AST structure using qi, a single parse pass was reduced from approximately 10 seconds to less than 4 seconds on the reference hardware. Already benefits were beginning to show, but there was still plenty of room for improvement.


# Transduction via the raw directive #

One easy switch to make was to stop copying parsed string tokens into std::wstrings, and instead treat all strings as iterator ranges pointing into the original code text stream. This is simply done using qi's raw directive, which allows precisely this distinction to be made. Unfortunately, separate timing data comparing the use of transduction to the use of full strings has been misplaced.

Eventually, transduction was replaced by lexical analysis, which performs a similar but higher-level optimization; see below for details.


# Attribute Propagation #

Profiling of the code indicated that the primary cost of parsing was involved in propagating AST node values through the parse call chain. Part of the issue is that qi eagerly constructs "blank" AST nodes every time it attempts to match a grammar production; this means that if a production fails and parsing continues with some other rule, we wasted the allocation of that AST node.

This has a twofold performance hit: first, construction of nontrivial node objects (especially nodes which hold containers of child nodes) is expensive to begin with. Secondly, it incurs a tremendous number of copies as attribute values propagate.

To address this, a simple "deferred construction" wrapper class was introduced. This class would default-construct to hold a null pointer, and only construct an instance of the target type when an actual value was available. This eliminated the cost of constructing AST nodes that were immediately discarded by failed productions.

This was by far the largest gain in the optimization process. Eliminating redundant node constructions dropped parse times from roughly 4 seconds to just over 75 milliseconds on average, using the reference hardware.


# Eliminating Copies #

With the deferred construction wrapper in place, profiling indicated that the main low-hanging fruit was to be found in node copies. Since the naively implemented wrapper class still copied its contained value once a value was constructed, a fair amount of dynamic allocation and copying was still necessary during parsing.

The first phase of eliminating unnecessary copying involved backing the deferred construction wrapper with a boost::shared\_ptr rather than a raw intrinsic pointer. This obviated the need to copy AST nodes at all; since a branch of the AST is effectively immutable once parsing has successfully elaborated that branch, it was possible to save the effort of creating deep copies of each branch.

Using shared\_ptr to back the AST nodes reduced parse times from 75 milliseconds to 47 milliseconds on the reference hardware.


# Improving on shared\_ptr #

Due to the implementation details of shared\_ptr, it was possible to perform excessive dynamic allocations used for the reference counter underlying shared\_ptr. The generally applicable solution to this problem is to switch to intrusive\_ptr instead, which does not require a dynamically allocated reference count, at the minor expense of requiring the target type to do its own reference counting via a member value.

The most problematic node types were selected for conversion to intrusive reference counting. After several iterations of profiling and experimenting with different combinations of these changes, parse times were further reduced to under 20 milliseconds.


# The Final Deferred Construction Wrapper #

Example code for the final wrapper can be found [here](http://code.google.com/p/scribblings-by-apoch/wiki/BoostSpiritDeferredConstructor).

# Lexical Analysis #

Once AST node copies were eliminated, the next obvious bottleneck was parser backtracking. qi generates recursive descent parsers that operate on LL(k) grammars. In a nutshell, this means that the parser might have to look at several successive tokens in the input before deciding which productions to match. If a production fails, all the work of examining those tokens must be rolled back, and then performed _again_ while testing against the next production.

When tokens are on a byte level, this creates a huge number of atomic lookahead/backtrack operations. Even relatively simple productions can be expensive to fail if they require examining many successive bytes.

The primary defense against this is lexical analysis. This divides the input text into word-length tokens prior to performing parsing. Now, when a production fails, we can backtrack in increments of entire words instead of individual bytes. The result is that backtracking becomes cheaper by roughly a factor of the average token length.

To perform lexical analysis for Epoch's compiler, boost::spirit::lex was called upon. This lexer framework integrates nicely with the qi parser generator and provides exactly the change in parsing granularity needed. Tokens are defined using regular expressions, and then the "type" of the token along with the raw string it represents are passed on to the parser. (Note that technically the raw text is provided by an iterator pair, not a copy of the substring.)

A substantial challenge to this deployment was the nature of Epoch's dynamic syntax. Since it is permissible to add syntactic constructs to the language at compile time (this is how the standard library operates), it is necessary to dynamically extend the token types that the lexer can understand.

Unfortunately, boost::spirit::lex is not designed for dynamic extension. All of its tokenization rules and regular expressions must be defined prior to the start of parsing. In order to work around this limitation, it was necessary to pass "unrecognized" tokens up to the parser (which _does_ allow dynamic mutation during the actual parsing process) for examination. Further details are provided below on how this was accomplished.

Initially, lexical analysis proved to actually run _slower_ than before; this was a completely counter-intuitive and unexpected result. Thankfully, as it turned out, there were a handful of simple mistakes in the parser adaptation that caused the inefficiency.

One of the more painful mistakes was related to the way attribute synthesis works in lex and qi. Lex allows individual tokens to carry data payloads ("attributes") up to the parser, via a variant record attached to the token itself. This is useful for doing things like matching numeric literals, or attaching categorical ID tags to classes of tokens, and so on.

However, the Epoch compiler does not make use of token attributes; all attribute synthesis and propagation is done at the parser level, because it is desirable to defer the construction and copying of AST nodes as long as possible. Therefore, the only data payload necessary on a token is the actual iterator pair describing the token's corresponding raw text.

In the initial deployment of the lexer, each token carried the iterator pair payload - but in a highly efficient way. The pair was stuffed into a vector (which only ever contained exactly one element) which was further contained in a variant record (which only ever contained exactly one type, the vector). Eliminating these two levels of indirection proved to be a substantial win, and lexing as a whole ended up paying off very handily.


# Token Adaptation #

A powerful feature of qi is the `symbols` parser, which stores a list of tokens which cause the production to match. This is substantially more efficient than a series of alternatives, and also can be extended during parsing itself. Since Epoch relies heavily on mutable syntax, this is a critical component for the Epoch parser.

Unfortunately, `symbols` and the lexer do not communicate very cleanly. The `symbols` parser demands an input in string iterators, and does not correctly handle the special iterators produced by the lexer. To work around this, a custom _directive_ was added to the qi parser, which specifically converts a token into its raw pair of string iterators, attempts to match the token against the valid tokens provided in the `symbols` rule, and then re-wraps the result into an attribute that can be utilized by the higher levels of the parser.

Adding this `adapttokens` directive enables the Epoch compiler to retain its fully mutable syntax semantics without sacrificing the considerable gains of using an underlying lexer.

[Source for the `adapttokens` directive](http://code.google.com/p/epoch-language/source/browse/EpochCompiler/Lexer/AdaptTokenDirective.h)


# Grammar Transformations #

The final line of defense against slow parsing times is to review the grammar itself for fundamental inefficiencies. These come in many flavors, but essentially for LL(k) recursive descent parsers they all boil down to a single pattern: a production is checked, fails, and leads to backtracking, before the next production can be checked.

Consider a production which looks for pattern A, or pattern B, or pattern C, in that order. If pattern C is more common than pattern B, and pattern B is in turn more common than A, the entire parsing process is going to be fundamentally wasteful. In the most common case, where production C is going to match, the parser spends needless time checking productions A and B first, and then backtracking to undo the work involved in attempting to match them.

Simply reversing the production to look for C first, then B, then A can dramatically improve parse times, because it is no longer necessary to backtrack nearly as often.

A parallel issue arises in the lexing layer, where certain classes of tokens (represented by the regular expressions that match them) are far more common than others. Since lexing is the lowest level of processing in the stack, a small inefficiency here is magnified across the entire parser infrastructure. Therefore, tweaking the lexer to check for more-common tokens before less-common ones can drastically increase throughput, by minimizing the time spent looking at rules which will fail.

One more pitfall is productions which are very different, but can be differentiated very early on in the examination of the input. A classic example of this in Epoch is the distinction between _standard entities_ (such as `if` statements) versus _postfix entities_ (such as `do`/`while` loops). A standard entity provides an expression to be checked and acted upon _prior_ to a block of code; a postfix entity provides a block of code _followed by_ an expression that controls the execution of the entity. The contents of that expression are optional and may be arbitrarily complex, meaning that matching the production is more complicated than a simple linear check of tokens.

It is possible to distinguish between a standard and a postfix entity simply by looking at a single token; the same token will never be overloaded to be both standard and postfix. It is always one or the other. The naive implementation of the entity matching production, however, requires first looking for an entity token, then looking for the optional parameter expression, then looking for a code block, and then looking for subsequent "chained" entities (such as `elseif` statements). If this fails, the entire examination is backtracked and the parser tries to match a postfix entity, which is similarly complex.

However, it is simple to avoid trying to match _either_ production by simply examining that first token. If it is not an entity identifier, or a lead-in for a postfix entity, then neither production needs to be considered at all.

This can be accomplished using qi's _and-predicate_, which matches an arbitrary production but does not consume it. The predicate can be attached to the _union_ of the standard and postfix entity identifiers, allowing the parser to examine in a single token whether or not it is worth trying to match the full entity productions:

```
AnyEntity = &(adapttokens
    [
        EntityIdentifierSymbols | PostfixEntitySymbols
    ])
    >> (Entity | PostfixEntity);
```

As it turns out, this is the only place in the Epoch grammar which actually benefits from this particular optimization, but the gains are substantial (relative to the total parse time, which is of course increasingly fast at this phase of optimization).


# Final Results #
After applying all of the above techniques, the final speed of the Epoch parser is astounding. All in all, the original test case can be parsed in just over 9 milliseconds on the reference hardware; the 2MB "stress" case requires roughly 950 milliseconds to parse.

_This represents a 1000-fold speed increase from the original Release 11 implementation of the Epoch parser._

Strictly speaking, this is not a true apples-to-apples comparison, because even the parsing "pre-pass" in the Release 11 compiler does some small semantic checking in addition to syntactic validation. So the new parser is doing a tiny bit less work overall. However, that caveat aside, the practical result is still around three orders of magnitude faster, which is a decidedly satisfactory result.