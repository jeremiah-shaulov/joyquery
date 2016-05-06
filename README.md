#joyquery - tiny Javascript library that emulates document.querySelector

##joyquery library

Joyquery is Javascript library that allows to perform CSS selector queries on DOM tree. It does the same job as embedded document.querySelector does, so it can be used as alternative in browsers that miss this function (like Microsoft Internet Explorer prior version 8).

Also joyquery enhances selectors language to provide more features.

Joyquery allows to call Javascript functions from inside selectors to perform complex tests on elements. For example:

var elements = joyquery
(	"div > p:contains-word-Hello",
	null,
	{	contains_word_Hello: function()
		{	return (this.node.textContent || this.node.innerText || '').indexOf('Hello') != -1;
		}
	}
).get();

Joyquery supports axises like in XPATH.

var elements = joyquery("figure preceding-sibling::div").get();

Joyquery supports all the standard selectors. However some of them are implemented in extensions, not in the library. See <a href="features.html">Features</a>.

Joyquery is small library: the library file in minified format is 10KiB (gzipped 4.3KiB). It is also relatively fast: on Firefox near same speed as jQuery for selectors that document.querySelector can't handle, and as twice faster on Chrome.

Joyquery runs on all respectable browsers, plus MSIE 6 or higher. When browser has embedded document.querySelector, and it is able to handle given selector, the built-in function is utilized.

Joyquery is iterable.

for (var elem, it=joyquery('div > a'); elem=it();)
{	 console.log(elem);
}

*	<a href="http://jeremiah-shaulov.github.io/joyquery/javascripts/joyquery.js">Download source</a>
*	<a href="http://jeremiah-shaulov.github.io/joyquery/joyquery.min.js.zip">Download minified .zip</a>
*	<a href="http://jeremiah-shaulov.github.io/joyquery/joyquery.min.js.tar.gz">Download minified .tar.gz</a>
