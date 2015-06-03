#joyquery - tiny enhanced document.querySelector emulator

##joyquery library

This is Javascript library that implements CSS selector queries on DOM tree. It does the same job as embedded document.querySelector does, so it can be used in browsers that miss this facility (like MSIE prior version 8).

Also joyquery enhances selectors language to provide more useful features. Joyquery allows to call Javascript functions from inside selectors to perform complex tests on elements. For example:

var elements = joyquery
(	"div > p:contains-word-Hello",
	null,
	{	contains_word_Hello: function()
		{	return (this.node.textContent || this.node.innerText || '').indexOf('Hello') != -1;
		}
	}
).get();

Also supports axises like in XPATH.

var elements = joyquery("figure preceding-sibling::div").get();

However currently there are features that querySelector has which are not implemented. See [Features][http://jeremiah-shaulov.github.io/joyquery/features.html].

Joyquery is iterable.

for (var elem, it=joyquery('div > a'); elem=it();)
{	 console.log(elem);
}

In this case elements are not stored in array, but new element is searched and retrieved each time you call the iterator.

The library file in minified format is 8.7KiB (gzipped 4KiB).

*	[Download source][http://jeremiah-shaulov.github.io/joyquery/javascripts/joyquery.js]
*	[Download minified .zip][http://jeremiah-shaulov.github.io/joyquery/joyquery.min.js.zip]
*	[Download minified .tar.gz][http://jeremiah-shaulov.github.io/joyquery/joyquery.min.js.tar.gz]
