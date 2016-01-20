> _**Note:** This page is split from the article OptimizingBoostSpirit for cleanliness. For context on what this wrapper is for and why it is useful, see that article._

# The Deferred Construction Wrapper #

The deferred construction wrapper is a simple template which can be configured to use boost::shared\_ptr _or_ boost::intrusive\_ptr at will:

```
template <typename T, typename PointerType = boost::shared_ptr<T> >
struct Deferred
{
	Deferred()
		: Contents(reinterpret_cast<T*>(NULL))
	{
		Content.Owner = this;
	}

	Deferred(const T& expr)
		: Contents(new (Allocate<T>()) T(expr))
	{
		Content.Owner = this;
	}

	Deferred(const Deferred& rhs)
		: Contents(rhs.Contents)
	{
		Content.Owner = this;
	}

	template <typename VariantContentT>
	Deferred(const VariantContentT& content)
		: Contents(new (Allocate<T>()) T(content))
	{
		Content.Owner = this;
	}

	operator T ()
	{
		if(Contents)
			return *Contents;

		return T();
	}

	operator T () const
	{
		if(Contents)
			return *Contents;

		return T();
	}

	Deferred& operator = (const Deferred& rhs)
	{
		if(this != &rhs)
			Contents = rhs.Contents;
		return *this;
	}

	struct SafeContentAccess
	{
		T& operator * () const
		{
			if(!Owner->Contents)
				Owner->Contents.reset(new (Allocate<T>()) T());

			return *(Owner->Contents);
		}

		T* operator -> () const
		{
			if(!Owner->Contents)
				Owner->Contents.reset(new (Allocate<T>()) T());

			return Owner->Contents.get();
		}

		Deferred* Owner;
	} Content;

protected:
	mutable PointerType Contents;
};
```

The purpose of the inner Content structure is to enable the use of boost::fusion to use deferred nodes in the AST:

```
BOOST_FUSION_ADAPT_STRUCT
(
	AST::DeferredStatement,
	(AST::IdentifierT, Content->Identifier)
	(AST::DeferredExpressionVector, Content->Params)
)
```

Without this intermediary, the fusion adapter would attempt to access the `Identifier` and `Params` members directly on `Deferred<>` which of course is a compile time error. By using the `Content` access wrapper, it is possible to enforce lazy construction of AST child nodes as well as eliminate copying.

If `Deferred<>` is configured to use an intrusive pointer, several additional bits of glue are necessary.

```
// In a header
template <typename T>
inline T* Allocate()
{
	return new T;
}

template <typename T>
void Deallocate(T* ptr)
{
	delete ptr;
}

template<> inline Expression* Allocate<Expression>()
{ return Memory::OneWayAllocateObject<Expression>(1); }

template<> inline void Deallocate(Expression* p)
{ Memory::OneWayRecordDeallocObject(p); }

void intrusive_ptr_add_ref(Expression* expr);
void intrusive_ptr_release(Expression* expr);

// In an implementation file
void AST::intrusive_ptr_add_ref(Expression* expr)
{
	++expr->RefCount;
}

void AST::intrusive_ptr_release(Expression* expr)
{
	if(--expr->RefCount == 0)
		Deallocate(expr);
}
```

The support for this is provided by a custom linear allocator; the description of this allocator is beyond the scope of this article, but feel free to explore the [class definitions](http://code.google.com/p/epoch-language/source/browse/Shared/Utility/Memory/OneWayAllocator.h?spec=svn4b1d903e774bcbff7b7494bef3412e7744f662c1&r=4b1d903e774bcbff7b7494bef3412e7744f662c1) and [implementation](http://code.google.com/p/epoch-language/source/browse/Shared/Utility/Memory/OneWayAllocator.cpp?spec=svn0c3cd54113c2dd4d810687b06cd856cf9e4f3db5&r=0c3cd54113c2dd4d810687b06cd856cf9e4f3db5) separately.

Note that for this purpose it is expressly forbidden to use inheritance hierarchies. This leads to a tiny bit more duplicated code, but this is a worthwhile tradeoff; the problem with using inheritance to eliminate code redundancy is that it strips type information at runtime.

Consider a situation where all reference counting is done by a shared base class instead of individually by every AST node struct. In this case, the deallocator only knows about the base class, not the derived classes. Unfortunately, as soon as the deallocator goes to destruct a node, it must ensure that the correct node destructor is called in order to clean up the reference counts properly. The only two solutions are to use virtual destructors, or to not use shared base classes.

Virtual destructors are a net loss in this case, because they introduce more size for each AST node (a v-table pointer must be maintained), they harm locality of reference (the code must do v-table lookups instead of simply operating on the AST node in a confined region of memory), and they introduce indirection which prevents the compiler from inlining the simpler destructors. The net result is that it is very much worth the mental overhead of deploying duplicated code, in order to gain a large degree of performance at runtime.


Once all of the infrastructure is in place, the grammar needs one minor tweak:

```
template <typename AttributeT>
struct Rule
{
	typedef typename boost::spirit::qi::rule<IteratorT, boost::spirit::char_encoding::standard_wide, AttributeT> type;
};

Rule<AST::Deferred<AST::Statement, boost::intrusive_ptr<AST::Statement> >()>::type Statement;
```

This instructs the qi parser generator to synthesize a deferred-construction attribute and suppress copying (due to the semantics of `Deferred<>` and its copying behavior). Moreover, this particular attribute node is marked as using intrusive reference counting and is hooked up to a linear allocator to make even deferred construction even faster.