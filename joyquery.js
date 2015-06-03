/**	joyquery v1.0 by Jeremiah Shaulov, 3 Jun 2015
 **/

joyquery =
(	function()
	{	var XML_ELEMENT_NODE = 1;
		var XML_TEXT_NODE = 3;
		var XML_CDATA_SECTION_NODE = 4;

		var TOKENIZER = /[~|^$*!]?=|::|\\:|([+\-]?\d+n(?:\s*[+\-]?\d+|\s*[+\-]\s+[+\-]?\d+)?)|((?:[\w_\-\x80-\xFF]|\\(?:[0-9A-Fa-f]{1,6}|.))+)|("[^"\\]*(?:\\[^"\\]*)*"|'[^'\\]*(?:\\[^'\\]*)*')|(\s+|\/\*[\S\s]*?\*\/)|./gi;
		var COMPLEX_NUMBER_TOKENIZER = /^\s*([+\-])\s*([+\-]?\d+)$/;

		var TOKEN_TYPE_COMPLEX_NUMBER = 0;
		var TOKEN_TYPE_IDENT = 1;
		var TOKEN_TYPE_STRING = 2;
		var TOKEN_TYPE_SPACE = 3;
		var TOKEN_TYPE_OTHER = 4;

		var SELF = 0;
		var CHILD = 1;
		var DESCENDANT = 2;
		var DESCENDANT_OR_SELF = 3;
		var PARENT = 4;
		var ANCESTOR = 5;
		var ANCESTOR_OR_SELF = 6;
		var FOLLOWING_SIBLING = 7;
		var FIRST_FOLLOWING_SIBLING = 8;
		var PRECEDING_SIBLING = 9;
		var FIRST_PRECEDING_SIBLING = 10;

		var AXIS_NAMES =
		{	'self': SELF,
			'child': CHILD,
			'descendant': DESCENDANT,
			'descendant-or-self': DESCENDANT_OR_SELF,
			'parent': PARENT,
			'ancestor': ANCESTOR,
			'ancestor-or-self': ANCESTOR_OR_SELF,
			'following-sibling': FOLLOWING_SIBLING,
			'first-following-sibling': FIRST_FOLLOWING_SIBLING,
			'preceding-sibling': PRECEDING_SIBLING,
			'first-preceding-sibling': FIRST_PRECEDING_SIBLING
		};

		var FUNCTIONS =
		{	empty: function()
			{	var node = this.node;
				for (var e=node.firstChild; e; e=e.nextSibling)
				{	if (e.nodeType!=XML_TEXT_NODE && e.nodeType!=XML_CDATA_SECTION_NODE || e.length)
					{	return false;
					}
				}
				return true;
			}
		};

		function json_encode_string(value)
		{	if (window.JSON)
			{	return JSON.stringify(value);
			}
			else
			{	return '"'+(''+value).replace
				(	/[\\'"<>&\x00-\x1F\u0080-\uFFFF]/g, function(m)
					{	return m=='\\' ? '\\u005C' : m=="'" ? "\\u0027" : m=='"' ? '\\u0022' : m=='\t' ? '\\t' : m=='\r' ? '\\r' : m=='\n' ? '\\n' : '\\u'+dechex(m.charCodeAt(0), 4);
					}
				)+'"';
			}
		}

		function dechex(n, digit_places)
		{	var s = '';
			for (var i=0; digit_places>0 ? i<digit_places : n; i++, n>>=4)
			{	s = '0123456789ABCDEF'.charAt(n & 0xF) + s;
			}
			return s;
		}

		function array_search(needle, haystack)
		{	for (var i=haystack.length-1; i>=0; i--)
			{	if (haystack[i] == needle) break;
			}
			return i;
		}

		function compile(css, node, axis, functions)
		{	var token_types = [];
			var tokens = [];
			var i = 0;
			css.replace
			(	TOKENIZER,
				function(token, is_complex_number, is_ident, is_string, is_space)
				{	tokens.push(token);
					token_types.push(is_complex_number ? TOKEN_TYPE_COMPLEX_NUMBER : is_ident ? TOKEN_TYPE_IDENT : is_string ? TOKEN_TYPE_STRING : is_space ? TOKEN_TYPE_SPACE : TOKEN_TYPE_OTHER);
				}
			);
			function read_ident(can_asterisk, can_ns, can_empty)
			{	var token = tokens[i];
				if (can_asterisk && token=='*' || token_types[i]==TOKEN_TYPE_IDENT)
				{	i++;
					if (can_ns && token!='*' && i+2<token.length && tokens[i+1]=='\\:' && token_types[i+2]==TOKEN_TYPE_IDENT)
					{	token += ':'+tokens[i+2];
						i += 2;
					}
					return css_unescape(token);
				}
				else if (can_empty && (token=='#' || token=='.' || token=='[' || token==':'))
				{	return '*';
				}
			}
			function read_string()
			{	var token = tokens[i];
				var c;
				if (token && ((c = token.charAt(0))=='"' || c=="'" || !isNaN(parseInt(c))))
				{	i++;
					return c=='"' || c=="'" ? eval(token) : token;
				}
			}
			function read_space()
			{	if (token_types[i] == TOKEN_TYPE_SPACE)
				{	return tokens[i++];
				}
			}
			function css_unescape(text)
			{	return text;
			}
			function error(message)
			{	throw new Error(message || 'Unsupported selector');
			}
			function parse_simple_selector(cur_path, axis)
			{	var token = read_ident(true, true, true);
				if (!token)
				{	return false;
				}
				if (tokens[i] == '::')
				{	i++;
					axis = AXIS_NAMES[token];
					if (axis == null)
					{	error('Unsupported axis: '+token);
					}
					token = read_ident(true, true);
					if (!token)
					{	error();
					}
				}
				var simple_selector =
				{	name: token=='*' ? '' : token.toUpperCase(),
					axis:axis,
					from: 1,
					limit: 0x7FFFFFFF,
					sub: [],
					cond: null
				};
				var conditions = [];
				function add_condition(name, oper, value, func_args, first_complex_number_arg)
				{	if (name==null || value==null)
					{	error();
					}
					var func_arg = func_args && func_args[0];
					if (oper == ':from')
					{	simple_selector.from = func_arg>1 ? func_arg-0 : 1;
						return;
					}
					if (oper == ':limit')
					{	simple_selector.limit = func_arg>0 ? func_arg-0 : 0x7FFFFFFF;
						return;
					}
					if (oper.charAt(0) != ':')
					{	name = name.toLowerCase();
						value = value.toLowerCase();
					}
					var func;
					switch (oper)
					{	case '' : func = node.hasAttribute ? "n.hasAttribute("+json_encode_string(name)+")" : "n.getAttribute("+json_encode_string(name)+")!=null"; break;
						case '=': func = "n.getAttribute("+json_encode_string(name)+")=="+json_encode_string(value); break;
						case '!=': func = "(n.getAttribute("+json_encode_string(name)+")||'')!="+json_encode_string(value); break;
						case '^=': func = "(a=n.getAttribute("+json_encode_string(name)+"))&&a.substr(0,"+(value.length)+")=="+json_encode_string(value); break;
						case '$=': func = "(a=n.getAttribute("+json_encode_string(name)+"))&&a.substr(a.length-"+(value.length)+")=="+json_encode_string(value); break;
						case '*=': func = "(n.getAttribute("+json_encode_string(name)+")||'').indexOf("+json_encode_string(value)+")!=-1"; break;
						case '|=': func = "(a=n.getAttribute("+json_encode_string(name)+"))&&(b="+json_encode_string(value)+")&&(a==b||a.substr(0,"+(value.length+1)+")==b+'-')"; break;
						case '~=':
							func =
							(	name=='class' && node.classList ?
									"(n.classList?n.classList.contains("+json_encode_string(value)+"):(' '+("
								: name=='class' && node.className!=null ?
									"((' '+(n.className!=null?n.className:"
								:
									"((' '+("
							)+"n.getAttribute("+json_encode_string(name)+"))+' ').indexOf("+json_encode_string(' '+value+' ')+")!=-1)";
						break;
						case ':root': func = "n==this.document.documentElement"; break;
						case ':first-child': func = node.firstElementChild!==undefined ? "!n.previousElementSibling" : "l(0,1)==0"; break;
						case ':last-child': func = node.firstElementChild!==undefined ? "!n.nextElementSibling" : "l(0,1)==l()-1"; break;
						case ':only-child': func = node.firstElementChild!==undefined ? "!n.previousElementSibling&&!n.nextElementSibling" : "l()==1"; break;
						case ':nth-child': func = !first_complex_number_arg ? "l(0,1)=="+(func_arg-1) : "(l(0,1)-("+(first_complex_number_arg.real-1)+"))%"+first_complex_number_arg.imag+"==0"; break;
						case ':nth-last-child': func = !first_complex_number_arg ? "l()-l(0,1)=="+func_arg : "(l()-l(0,1)-("+first_complex_number_arg.real+"))%"+first_complex_number_arg.imag+"==0"; break;
						case ':first-of-type': func = "l(1,1)==0"; break;
						case ':last-of-type': func = "l(1,1)==l(1)-1"; break;
						case ':only-of-type': func = "l(1)==1"; break;
						case ':nth-of-type': func = !first_complex_number_arg ? "l(1,1)=="+(func_arg-1) : "(l(1,1)-("+(first_complex_number_arg.real-1)+"))%"+first_complex_number_arg.imag+"==0"; break;
						case ':nth-last-of-type': func = !first_complex_number_arg ? "l(1)-l(1,1)=="+func_arg : "(l(1)-l(1,1)-("+first_complex_number_arg.real+"))%"+first_complex_number_arg.imag+"==0"; break;
						case ':not': func = "!this.evaluate(n,"+func_arg+")()"; break;
						case ':has': func = "this.evaluate(n,"+func_arg+")()"; break;
						case ':any': func = "(this.evaluate(n,"+func_args.join(")()||this.evaluate(n,")+")())"; break;
						case ':focus': func = "n==this.document.activeElement"; break;
						case ':target': func = "n.id==this.window.location.hash.substr(1)"; break;
						case ':disabled': func = "(n.disabled&&n.nodeName!='STYLE'||(a=n.parentNode)&&a.disabled)"; break;
						case ':enabled': func = "(b=n.disabled)!=null&&!b&&(n.value!=null||n.label!=null)"; break;
						case ':checked': func = "(n.checked||n.selected)"; break;
						case ':hidden': func = "!n.offsetWidth&&!n.offsetHeight"; break;
						case ':link': func = "n.href&&n.nodeName=='A'"; break;
						case ':input': func = "n.value!=null&&((a=n.nodeName)=='INPUT'||a=='SELECT'||a=='TEXTAREA'||a=='BUTTON')"; break;
						default:
							var func_name = oper.substr(1).replace(/-/g, '_');
							func_args.splice(0, 0, 'this');
							func = 'this.'+(functions[func_name] ? 'functions.' : 'FUNCTIONS.')+func_name+'.call('+func_args.join(',')+')';
						break;
					}
					conditions.push(func);
				}
				while (true)
				{	token = tokens[i];
					if (token == '#')
					{	i++;
						add_condition('id', '=', read_ident(false, false));
					}
					else if (token == '.')
					{	i++;
						add_condition('class', '~=', read_ident(false, false));
					}
					else if (token == '[')
					{	i++;
						read_space();
						var name = read_ident(true, true);
						read_space();
						token = tokens[i];
						var oper = '';
						var value = '';
						if (token.charAt(token.length-1) == '=')
						{	i++;
							read_space();
							oper = token;
							value = read_string();
							read_space();
						}
						if (tokens[i++] != ']')
						{	error();
						}
						add_condition(name, oper, value);
					}
					else if (token == ':')
					{	i++;
						var name = read_ident(true, true);
						var func_args = [];
						var first_complex_number_arg = null;
						if (tokens[i] == '(')
						{	while (true)
							{	i++;
								read_space();
								var func_arg = tokens[i];
								var func_arg_type = token_types[i];
								i++;
								if (func_arg_type == TOKEN_TYPE_COMPLEX_NUMBER)
								{	var complex_number = func_arg.toLowerCase().split('n');
									var real = complex_number[1];
									var imag = complex_number[0];
									if (!real)
									{	real = '0';
									}
									else if (isNaN(parseInt(real)))
									{	var match = real.match(COMPLEX_NUMBER_TOKENIZER);
										real = match[1]=='-' ? -match[2] : match[2];
									}
									func_arg = '{imag:'+imag+',real:'+real+'}';
									if (!func_args.length)
									{	first_complex_number_arg = {imag:imag, real:real};
									}
								}
								else if (func_arg_type!=TOKEN_TYPE_STRING && isNaN(parseInt(func_arg)))
								{	i--;
									func_arg = simple_selector.sub.length;
									simple_selector.sub.push(parse(SELF, true));
								}
								func_args.push(func_arg);
								read_space();
								if (tokens[i] != ',')
								{	break;
								}
							}
							if (tokens[i++] != ')')
							{	error();
							}
						}
						add_condition('', ':'+name, '', func_args, first_complex_number_arg);
					}
					else
					{	break;
					}
				}
				if (conditions[0])
				{	simple_selector.cond = !conditions[0] ? null : new Function('var a,b,n=this.node,l=this.last;return '+(conditions.join('&&')));
				}
				cur_path.push(simple_selector);
				return true;
			}
			function parse(axis, is_func_args)
			{	var initial_axis = axis;
				var cur_path = [];
				var path = [cur_path];
				read_space();
				while (tokens[i])
				{	if (!parse_simple_selector(cur_path, axis))
					{	error();
					}
					axis = DESCENDANT;
					read_space();
					var token = tokens[i];
					if (token == '>')
					{	i++;
						axis = CHILD;
					}
					else if (token=='~' || token=='+')
					{	i++;
						axis = token=='~' ? FOLLOWING_SIBLING : FIRST_FOLLOWING_SIBLING;
					}
					else if (token == ',')
					{	if (is_func_args)
						{	break;
						}
						i++;
						axis = initial_axis;
						cur_path = [];
						path.push(cur_path);
					}
					else if (token == ')')
					{	break;
					}
					read_space();
				}
				return path;
			}
			var path = parse(axis);
			if (tokens[i])
			{	error();
			}
			return path;
		}

		function path_subevaluate(node, n_sub_path)
		{	return evaluate(this.s[n_sub_path], this.node, this.functions);
		}

		function select_matching(cur_path, step, node, subnode, functions, win, doc, position_range, position, last, position_ot, last_ot, positions, lasts, position_ots, last_ots, n_positions, no_enter)
		{	var simple_selector = cur_path[step];
			var name = simple_selector.name;
			var axis = simple_selector.axis;
			var from = simple_selector.from;
			var limit = simple_selector.limit;
			var cond = simple_selector.cond;
			var sub_paths = simple_selector.sub;
			var is_last_step = step == cur_path.length-1;
			var ctx = {node:null, window:win, document:doc, FUNCTIONS:FUNCTIONS, functions:functions, evaluate:path_subevaluate, s:sub_paths, position:get_position, last:get_last};
			if (!subnode)
			{	subnode = axis==SELF || axis==ANCESTOR_OR_SELF ? node : axis==PARENT || axis==ANCESTOR ? node.parentNode : axis==CHILD ? node.firstChild : axis==FOLLOWING_SIBLING || axis==FIRST_FOLLOWING_SIBLING ? node.nextSibling : axis==PRECEDING_SIBLING || axis==FIRST_PRECEDING_SIBLING ? node.previousSibling : axis==DESCENDANT ? node : null;
				position = axis==SELF || axis==DESCENDANT || axis==DESCENDANT_OR_SELF || axis==ANCESTOR_OR_SELF ? position : axis==CHILD ? 0 : axis==FOLLOWING_SIBLING || axis==FIRST_FOLLOWING_SIBLING ? position+1 : axis==PRECEDING_SIBLING || axis==FIRST_PRECEDING_SIBLING ? position-1 : NaN;
				position_ot = axis==SELF || axis==DESCENDANT || axis==DESCENDANT_OR_SELF ? position_ot : axis==CHILD ? (name?0:NaN) : NaN;
			}
			var inc_position = axis==PRECEDING_SIBLING ? -1 : +1;
			var use_element_child = node && node.firstElementChild!==undefined;
			function get_last(is_ot, is_p)
			{	var value = is_ot ? (is_p ? position_ot : last_ot) : (is_p ? position : last);
				if (isNaN(value))
				{	if (!is_ot)
					{	if (isNaN(position))
						{	position = 0;
							for (var n=(use_element_child ? subnode.previousElementSibling : subnode.previousSibling); n; n=(use_element_child ? n.previousElementSibling : n.previousSibling))
							{	if (n.nodeType == XML_ELEMENT_NODE)
								{	position++;
								}
							}
							if (is_p)
							{	return position;
							}
						}
						last = position + 1;
						for (var n=(use_element_child ? subnode.nextElementSibling : subnode.nextSibling); n; n=(use_element_child ? n.nextElementSibling : n.nextSibling))
						{	if (n.nodeType == XML_ELEMENT_NODE)
							{	last++;
							}
						}
						value = last;
					}
					else
					{	var node_name = subnode.nodeName;
						if (node_name == name)
						{	if (isNaN(position_ot))
							{	position_ot = 0;
								for (var n=(use_element_child ? subnode.previousElementSibling : subnode.previousSibling); n; n=(use_element_child ? n.previousElementSibling : n.previousSibling))
								{	if (n.nodeName == node_name)
									{	position_ot++;
									}
								}
								if (is_p)
								{	return position_ot;
								}
							}
							last_ot = position_ot + 1;
							for (var n=(use_element_child ? subnode.nextElementSibling : subnode.nextSibling); n; n=(use_element_child ? n.nextElementSibling : n.nextSibling))
							{	if (n.nodeName == node_name)
								{	last_ot++;
								}
							}
							value = last_ot;
						}
						else
						{	var p = 0;
							for (var n=(use_element_child ? subnode.previousElementSibling : subnode.previousSibling); n; n=(use_element_child ? n.previousElementSibling : n.previousSibling))
							{	if (n.nodeName == node_name)
								{	p++;
								}
							}
							if (!is_p)
							{	p++;
								for (var n=(use_element_child ? subnode.nextElementSibling : subnode.nextSibling); n; n=(use_element_child ? n.nextElementSibling : n.nextSibling))
								{	if (n.nodeName == node_name)
									{	p++;
									}
								}
							}
							value = p;
						}
					}
				}
				return value;
			}
			function get_position(is_ot)
			{	return get_last(is_ot, true);
			}
			while (true)
			{	var next;
				if (axis==SELF || axis==PARENT)
				{	next = null;
				}
				else if (axis == FIRST_FOLLOWING_SIBLING)
				{	next = subnode && subnode.nodeType!=XML_ELEMENT_NODE ? subnode.nextSibling : null;
				}
				else if (axis == FIRST_PRECEDING_SIBLING)
				{	next = subnode && subnode.nodeType!=XML_ELEMENT_NODE ? subnode.previousSibling : null;
				}
				else if (axis==CHILD || axis==FOLLOWING_SIBLING)
				{	next = subnode && (use_element_child ? subnode.nextElementSibling : subnode.nextSibling);
				}
				else if (axis == PRECEDING_SIBLING)
				{	next = subnode && (use_element_child ? subnode.previousElementSibling : subnode.previousSibling);
				}
				else if (axis==ANCESTOR || axis==ANCESTOR_OR_SELF)
				{	next = subnode && subnode.parentNode;
					position = NaN;
					last = NaN;
					position_ot = NaN;
					last_ot = NaN;
				}
				else
				{	var n2;
					if (subnode == null) // DESCENDANT_OR_SELF
					{	subnode = node;
					}
					else if ((n2 = use_element_child ? subnode.firstElementChild : subnode.firstChild) && !no_enter)
					{	subnode = n2;
						positions[n_positions] = position;
						lasts[n_positions] = last;
						position_ots[n_positions] = position_ot;
						last_ots[n_positions] = last_ot;
						n_positions++;
						position = 0;
						last = NaN;
						position_ot = name ? 0 : NaN;
						last_ot = NaN;
					}
					else
					{	no_enter = false;
						while (true)
						{	if (subnode == node)
							{	return;
							}
							if ((n2 = use_element_child ? subnode.nextElementSibling : subnode.nextSibling))
							{	subnode = n2;
								break;
							}
							subnode = subnode.parentNode;
							n_positions--;
							position = positions[n_positions];
							last = lasts[n_positions];
							position_ot = position_ots[n_positions];
							last_ot = last_ots[n_positions];
						}
					}
					next = subnode;
				}
				if (!subnode)
				{	break;
				}
				var is_found = false;
				if (subnode.nodeType == XML_ELEMENT_NODE)
				{	if (!name || subnode.nodeName==name)
					{	ctx.node = subnode;
						if (!cond || cond.call(ctx))
						{	if (!is_last_step)
							{	var next_axis = cur_path[step + 1].axis;
								if (next_axis==DESCENDANT || next_axis==DESCENDANT_OR_SELF)
								{	no_enter = true; // no_enter is only used when axis==DESCENDANT || axis==DESCENDANT_OR_SELF
								}
							}
							position_range++;
							is_found = from <= position_range;
							var maybe_found_node = subnode;
						}
						position_ot += inc_position;
					}
					position += inc_position;
				}
				subnode = next;
				if (is_found)
				{	if (!is_last_step)
					{	var next_iter_found = select_matching(cur_path, step+1, maybe_found_node, null, functions, win, doc, 0, position, last, position_ot, last_ot, [], [], [], [], 0, false);
					}
					if (is_last_step || next_iter_found)
					{	var next_iter = !subnode || from-1+limit <= position_range ? null : function()
						{	return select_matching(cur_path, step, node, subnode, functions, win, doc, position_range, position, last, position_ot, last_ot, positions, lasts, position_ots, last_ots, n_positions, no_enter);
						};
						var iter =
						{	result: is_last_step ? maybe_found_node : next_iter_found.result,
							next: is_last_step ? next_iter : function()
							{	if (next_iter_found = next_iter_found.next && next_iter_found.next())
								{	iter.result = next_iter_found.result;
									return iter;
								}
								return next_iter && next_iter();
							}
						};
						return iter;
					}
				}
			}
		}

		function evaluate(path_obj_or_str, node, functions, prefer_builtin)
		{	if (!functions)
			{	functions = {};
			}
			var path;
			if (!node)
			{	node = document.documentElement || document.body;
			}
			var doc = node.ownerDocument || document;
			var win = doc.defaultView || doc.parentWindow || window;
			var iter, result;
			var i = -1;
			var using_builtin = false;
			var it = function(it_prefer_builtin, one_elem_enuogh)
			{	if (i == -1)
				{	var is_string = typeof(path_obj_or_str) != 'object';
					var func = one_elem_enuogh ? 'querySelector' : 'querySelectorAll';
					if (is_string && (it_prefer_builtin || prefer_builtin) && node[func] && prefer_builtin!==false)
					{	try
						{	result = node[func](path_obj_or_str);
							if (one_elem_enuogh)
							{	result = result ? [result] : [];
							}
							using_builtin = true;
//console.log('Using builtin: '+path_obj_or_str);
						}
						catch (e)
						{
						}
					}
					if (!using_builtin)
					{	path = is_string ? compile(path_obj_or_str, node, !node ? DESCENDANT_OR_SELF : DESCENDANT, functions) : path_obj_or_str;
					}
					path_obj_or_str = null;
				}
				if (using_builtin)
				{	// using built-in
					return result && result[++i] || (node = functions = result = null);
				}
				else
				{	// emulating
					while (!iter)
					{	i++;
						if (!path[i])
						{	return (path = node = functions = null);
						}
						iter = select_matching(path[i], 0, node, null, functions, win, doc, 0, NaN, NaN, NaN, NaN, [], [], [], [], 0, false);
					}
					var elem = iter.result;
					iter = iter.next && iter.next();
					return elem;
				}
			};
			it.get = function(at, count)
			{	var want_scalar = at!=null && count==null;
				count = at==null ? 0x7FFFFFFF : count>0 ? count-0 : 1;
				at = at>0 ? at-0 : 0;
				var it_prefer_builtin = at==0 && (count==1 || count==0x7FFFFFFF);
				var one_elem_enuogh = at==0 && want_scalar;
				var get_result = [];
				var j = -at;
				while (j<count && (elem=it(it_prefer_builtin, one_elem_enuogh)))
				{	if (using_builtin || array_search(elem, get_result)==-1)
					{	get_result[get_result.length] = elem;
						j++;
					}
				}
				if (at > 0)
				{	get_result = get_result.slice(at);
				}
				return want_scalar ? get_result[0] : get_result;
			};
			return it;
		}

		evaluate.FUNCTIONS = FUNCTIONS;

		return evaluate;
	}
)();
