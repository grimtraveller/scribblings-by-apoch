# Introduction #

A couple of years ago, I found myself in a position where I needed to write some code that was heavily dependent on legal type conversions in C++. Specifically, I needed a smart pointer class which would automatically decay from a pointer-to-subtype into a pointer-to-supertype.

For instance, suppose we have the following code:

```
struct Base
{
    // Stuff
};

struct Derived : public Base
{
    // More stuff
};

int main()
{
    SmartPointer<Derived> derived(new Derived);
    SmartPointer<Base> basepointer = derived;
}
```

Clearly, we want this to work, just as we can implicitly decay from a `Derived*` to a `Base*` in raw pointer space. However, we also want to prevent the inverse from being performed: going from a `Base*` to a `Derived*` requires a cast in C++, and for good reasons: a `Base` object is not necessarily always a `Derived` object!

Many programmers writing their first smart pointer are tempted to simply use a `static_cast` to do this job; however, this falls afoul of a dirty secret of C++ casting: `static_cast` allows you to cast both up _and_ down the inheritance hierarchy, and will _not_ complain if you do something obviously broken like this:

```
Base* foo = new Base;
Derived* bar = static_cast<Derived*>(foo);
```

A `dynamic_cast` will correctly catch this situation, but wouldn't it be nice if we could get a compile-time error instead of having to wait for a null-pointer or `std::bad_cast` exception at runtime?


# The Solution #

Fortunately, although C++ is a minefield and a snake pit rolled into one, it's also pretty powerful. We can do some trickery with the compiler to convince it to give us a meaningful compile-time error message when we do a bad cast in code, without any overhead or cost at runtime, and at only a small cost of voodoo in the compiled code.

Following is the complete source header for the solution, provided free of charge and free for any use under the New BSD License:

```
//
// EnableIfConvertible.h
// Helper templates for conditionally enabling code
//
// Adapted (lightly) from boost::intrusive_ptr and boost::detail::sp_enable_if_convertible
// 
// Originally written by Mike Lewis
// 2010-01-30
//

#pragma once


//
// This struct is the core of the conversion test. It detects if the type
// given by T1 can be converted into the type given by T2.
//
// The principle is fairly simple: we define two overloads of the function
// TestDummy. One overload accepts a pointer to a T2 object, and the other
// is a simple variadic function, i.e. the compiler will allow us to pass
// virtually anything to it. Each overload also returns a different helper
// type, "yes" or "no." These helpers have different sizes so that we can
// distinguish between them at compile time using the sizeof operator.
//
// The actual check is managed by the PerformConversionCheck enum. This
// enum contains a single value, CheckResult. The value will be true if
// the type conversion is allowed, or false otherwise. In order to pick
// the correct value, we ask the compiler for the size of the return value
// of the TestDummy function. We do this by passing a pointer of type T1
// into the TestDummy function. If the conversion from T1 to T2 is legal,
// the compiler will choose the first TestDummy overload, which returns
// the "yes" helper type. If the conversion is not possible, the compiler
// will instead use the variadic overload of TestDummy, which returns the
// special "no" helper type. Once this overload resolution is complete,
// the compiler knows the correct size of TestDummy's return value. If
// that size is equal to the size of the "yes" helper type, we know that
// the compiler selected the first TestDummy overload, and therefore we
// know that converting from T1 to T2 is legal.
//
template<class T1, class T2>
struct CanConvertTypes
{
    typedef char (&yes)[1];
    typedef char (&no)[2];

    static yes TestDummy(T2*);
    static no TestDummy(...);

    enum PerformConversionCheck
    {
        CheckResult = (sizeof(TestDummy(static_cast<T1*>(NULL))) == sizeof(yes))
    };
};


//
// This dummy structure is used later to flag "enable-if" results that are accepted.
// If the helper template (see below) provides the correct typedef, then we can
// assign an unnamed temporary EnableIfDummy to the helper, which means the code will
// compile cleanly. If the typedef is not available, the assignment will fail, and
// trigger the compiler logic that makes the static check possible (see final notes).
//
struct EnableIfDummy { };


//
// This helper template is specialized based on a boolean value. When the provided
// value is true, the template specialization contains a typedef for EnableIfDummy.
// If the provided value is false, that typedef is not present, so any code that
// tries to use the typedef will fail to compile.
//
template<bool> struct EnableIfTypesCanBeConvertedHelper;

template<> struct EnableIfTypesCanBeConvertedHelper<true>
{
    typedef EnableIfDummy type;
};

template<> struct EnableIfTypesCanBeConvertedHelper<false>
{
};

//
// This struct is the public interface for performing an "enable-if" check. The two
// provided types are passed along to the CanConvertTypes struct; the function of
// that struct is detailed above. The final enum value CheckResult will be true or
// false, depending on whether or not the type conversion is legal. This true/false
// flag directs the compiler to select the corresponding specialization of the helper
// template, EnableIfTypesCanBeConvertedHelper. By connecting these pieces of logic,
// we will end up deriving the conversion class from either the true or false version
// of the helper template. If the true version is selected, it will contain a typedef
// that can be used by the calling code; otherwise, that typedef is invalid. The
// code using this template explicitly requests to use that typedef, meaning that if
// the typedef is present, the code will compile; otherwise, it will not. The final
// result is that we can disable code from working if the types can't be converted
// as the caller requests.
//
template<class T1, class T2>
struct EnableIfTypesCanBeConverted
  : public EnableIfTypesCanBeConvertedHelper
    <
     CanConvertTypes<T1, T2>::CheckResult
    >
{
};



//
// FINAL NOTES: an example, and how the compiler can give us useful error messages
// even though we're doing a lot of template magic to make this all work.
//
// Consider the following example, where we want to allow a conversion constructor
// for some types, but disallow it for others, specifically we only want to allow
// conversion of the wrapper class if the nested pointers can also be converted
// legally:
//
// template<class T2> AutoReleasePtr
// (
//   const AutoReleasePtr<T2>& autoreleaseptr,
//   typename EnableIfTypesCanBeConverted<T2, T>::type safetycheck = EnableIfDummy()
// );
//
// As detailed above, if the type conversion is legal, the typedef "type" will be
// available, and therefore the above code will compile. If the conversion is not
// legal, the code will not compile.
//
// The trick is a special rule in C++ called "Substitution Failure Is Not An Error",
// commonly referred to as SFINAE. This rule states that if a template overload
// fails to compile, the compiler should silently ignore this failure and continue
// to look for other overloads that work correctly. (This applies to things beyond
// just function overloading, but that's out of the scope of what we need to do
// for this particular code.)
//
// Since the enable-if check produces invalid code when the check fails, the compiler
// will trigger SFINAE. It will attempt any other conversions it can; if any of those
// are allowed, then the code compiles, and even better, it compiles with the correct
// conversion code for us. However, if no conversions can be generated, the compiler
// must fall back on the original copy constructor:
//
// AutoReleasePtr(const AutoReleasePtr<T>& autoreleaseptr);
//
// But that copy constructor can't be compiled with an illegal coversion involved! So
// the compiler gets this far without complaining to us, but now it is totally stuck.
// Since the conversion is illegal, the compiler will say that the conversion from one
// AutoReleasePtr type to another is not allowed. The template parameters for each
// pointer wrapper are also displayed, so we can immediately see that the cause of a
// compile error in this case is because of an invalid conversion between the raw
// pointer types.
//
// And voila! We have successfully enabled (or disabled) a piece of code, based on
// whether or not a type conversion is valid. Best of all, all this is compiled away
// and involves no run-time overhead, so there is no cost to using this trick.
//
```