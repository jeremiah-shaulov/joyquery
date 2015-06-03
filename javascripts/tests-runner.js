var tests_runner =
(	function()
	{	function Report(test_repeat_times)
		{	this.user_agent = navigator.userAgent;
			this.date = new Date().getTime();
			this.test_repeat_times = test_repeat_times;
			this.entries = [];

			this.to_html = function()
			{	var PASS_NO = -1;
				var PASS_UNKNOWN = 0;
				var PASS_YES = 1;
				var PASS_AS_JQUERY = 2;
				var PASS_NOT_AS_JQUERY = 3;
				var html =
				(	'<table border="1" style="border-collapse:collapse">'+
						'<tr>'+
							'<td colspan="6"><b>User agent:</b> '+this.user_agent+'</td>'+
						'</tr>'+
						'<tr>'+
							'<td colspan="6"><b>Date:</b> '+new Date(this.date).toLocaleString()+'</td>'+
						'</tr>'+
						'<tr>'+
							'<td colspan="6"><b>Number of test iterations:</b> '+this.test_repeat_times+'</td>'+
						'</tr>'+
						'<tr>'+
							'<th>Selector</th>'+
							'<th>Pass</th>'+
							'<th>Details</th>'+
							'<th>Time</th>'+
							'<th>Time built-in</th>'+
							'<th>Time jQuery</th>'+
						'</tr>'
				);
				var sum_time_e_b_e=0, sum_time_e_b_b=0;
				var sum_time_e_j_e=0, sum_time_e_j_j=0;
				for (var i=0, i_end=this.entries.length; i<i_end; i++)
				{	var entry = this.entries[i];
					var selector = test_selectors[i];
					var pass = entry.time==null ? PASS_NO : entry.time_b!=null ? PASS_YES : entry.time_j!=null ? PASS_AS_JQUERY : PASS_UNKNOWN;
					var details = '';
					if (entry.error)
					{	details += 'Error: '+entry.error+'. ';
					}
					else
					{	if (entry.missing.length)
						{	pass = entry.time_b!=null ? PASS_NO : PASS_NOT_AS_JQUERY;
							details += 'Not found: '+entry.missing.join(', ')+'. ';
						}
						if (entry.extra.length)
						{	pass = entry.time_b!=null ? PASS_NO : PASS_NOT_AS_JQUERY;
							details += 'Extra found: '+entry.extra.join(', ')+'. ';
						}
					}
					if (pass == PASS_UNKNOWN)
					{	details += 'Found: '+(entry.result.length ? entry.result.join(', ') : '(none)')+'. ';
					}
					var pass_html = pass==PASS_UNKNOWN ? '<td style="color:rgb(202, 131, 0)">unknown</td>' : pass==PASS_NO ? '<td style="color:red">no</td>' : pass==PASS_AS_JQUERY ? '<td style="color:blue">as jQuery</td>' : pass==PASS_NOT_AS_JQUERY ? '<td style="color:rgb(202, 131, 0)">not as jQuery</td>' : '<td style="color:green">yes</td>';
					html += '<tr><td>'+selector+'</td>'+pass_html+'<td>'+details+'</td><td>'+entry.time+'</td><td>'+entry.time_b+'</td><td>'+entry.time_j+'</td></tr>';
					if (entry.time!=null && entry.time_b!=null)
					{	sum_time_e_b_e += entry.time;
						sum_time_e_b_b += entry.time_b;
					}
					if (entry.time!=null && entry.time_j!=null && entry.time_b==null)
					{	sum_time_e_j_e += entry.time;
						sum_time_e_j_j += entry.time_j;
					}
				}
				html +=
				(		'<tr>'+
							'<td colspan="6">Time taken when both emulation and build-in succeeded: emulation: <b>'+sum_time_e_b_e+'msec</b>, build-in: <b>'+sum_time_e_b_b+'msec</b>'+
						'</tr>'+
						'<tr>'+
							'<td colspan="6">Time taken when both emulation and jQuery succeeded, but built-in failed, so jQuery didn\'t optimize: emulation: <b>'+sum_time_e_j_e+'msec</b>, jQuery: <b>'+sum_time_e_j_j+'msec</b>'+
						'</tr>'+
					'</table>'
				);
				return html;
			};

			var ENTRY_PROPS = ['time', 'time_b', 'time_j', 'missing', 'extra', 'result', 'error'];

			this.__sleep = function()
			{	var state =
				{	user_agent: this.user_agent,
					date: this.date,
					test_repeat_times: this.test_repeat_times,
					entries: []
				};
				for (var i=0; i<this.entries.length; i++)
				{	var entry = this.entries[i];
					var entry_2 = [];
					for (var j=0; j<ENTRY_PROPS.length; j++)
					{	var p = ENTRY_PROPS[j];
						var value = entry[p];
						if (value!=null && (!value.join || value.length>0))
						{	entry_2[j] = value;
						}
					}
					state.entries.push(entry_2);
				}
				return state;
			};

			this.__wakeup = function(state)
			{	this.user_agent = state.user_agent;
				this.date = state.date;
				this.test_repeat_times = state.test_repeat_times;
				this.entries = [];
				for (var i=0; i<state.entries.length; i++)
				{	var entry_2 = state.entries[i];
					var entry = {};
					for (var j=0; j<ENTRY_PROPS.length; j++)
					{	var p = ENTRY_PROPS[j];
						entry[p] = entry_2[j];
					}
					entry.result = entry.result || [];
					entry.missing = entry.missing || [];
					entry.extra = entry.extra || [];
					this.entries.push(entry);
				}
				return this;
			};
		}

		function strhash(str)
		{	var HASHWORDBITS = 32;
			var sum = 0;
			var shift_by = 8;
			for (var i=0, i_end=str.length; i<i_end; i++)
			{	if (i == HASHWORDBITS/8)
				{	shift_by = 7;
				}
				var c = (str.charCodeAt(i) ^ i) & 0xFF;
				var high = sum & (0xFF << (HASHWORDBITS - shift_by));
				sum ^= high; // zero high 8 or 7 bits
				sum = (sum << shift_by) ^ (high >> (HASHWORDBITS - shift_by)) ^ c;
			}
			return sum;
		}

		function dechex(n, digit_places)
		{	var s = '';
			for (var i=0; digit_places>0 ? i<digit_places : n; i++, n>>=4)
			{	s = '0123456789ABCDEF'.charAt(n & 0xF) + s;
			}
			return s;
		}

		function json_encode(value)
		{	if (window.JSON)
			{	return JSON.stringify(value);
			}
			else if (value == null)
			{	return 'null';
			}
			else if (value === false)
			{	return 'false';
			}
			else if (value === true)
			{	return 'true';
			}
			else if (typeof(value) == 'object')
			{	var result = [];
				var is_object = false;
				for (var i in value)
				{	if (!(i in {}) && typeof(value[i])!='function')
					{	result[result.length] = json_encode(i)+':'+json_encode(value[i]);
						is_object = is_object || isNaN(parseInt(i)) && i!='length';
					}
				}
				if (is_object)
				{	return '{'+result.join(',')+'}';
				}
				result = [];
				for (var i=0, j=value.length; i<j; i++)
				{	result[result.length] = json_encode(value[i]);
				}
				return '['+result.join(',')+']';
			}
			else if (typeof(value) == 'number')
			{	return ''+value;
			}
			else
			{	return '"'+(''+value).replace
				(	/[\\'"<>&\x00-\x1F\u0080-\uFFFF]/g, function(m)
					{	return m=='\\' ? '\\u005C' : m=="'" ? "\\u0027" : m=='"' ? '\\u0022' : m=='\t' ? '\\t' : m=='\r' ? '\\r' : m=='\n' ? '\\n' : '\\u'+dechex(m.charCodeAt(0), 4);
					}
				)+'"';
			}
		}

		function json_decode(str)
		{	if (str == null) return str;
			if (window.JSON)
			{	return JSON.parse(str);
			}
			else
			{	return new Function('str', 'return eval("("+str+")")')(str);
			}
		}

		function array_search(needle, haystack)
		{	for (var i=haystack.length-1; i>=0; i--)
			{	if (haystack[i] == needle) break;
			}
			return i;
		}

		/*function get_cookie(name)
		{	return (((';'+document.cookie).match(new RegExp(';\\s*'+encodeURIComponent(name)+'=([^;]+)')) || ['', ''])[1] || '').replace(/%3B/ig, ';');
		}*/

		var TEST_ELEMS = ['', '*', 'div', 'LAbel', 'INPUT'];
		var TEST_CONDITIONS =
		[	'',
			'#textarea-1',
			'.textarea-1-3',
			'[TYpe]',
			'[Type="radIO"]',
			'[Type!="radIO"]',
			'[Type~="radIO"]',
			'[Class~="textarea-1-3"]',
			'[Type^="textarea"]',
			'[type$="-2"]',
			'[type *=\n"tt"]',
			'[type|="textarea"]',
			'[type|="textarea-"]',
			':root',
			':first-child',
			':last-child',
			':nth-child(2)',
			':nth-last-child(2)',
			':nth-child(4n-1)',
			':nth-last-child(3n+1)',
			':first-of-type',
			':last-of-type',
			':nth-of-type(2)',
			':nth-last-of-type(2)',
			':nth-of-type(3n+1)',
			':nth-last-of-type(4n-1)',
			':only-child',
			':only-of-type',
			':empty',
			':link',
			':focus',
			':target',
			':enabled',
			':disabled',
			':checked',
			':input',
			':hidden'/*,
			':not(* > input)',
			':has(* > input)'*/
		];

		var test_selectors = null;
		var test_selectors_hash = null;

		function init_test_selectors()
		{	if (!test_selectors)
			{	test_selectors = ['tr+tr', 'tr~tr', 'div div>div tbody *>td'];
				for (var i=0; i<TEST_ELEMS.length; i++)
				{	for (var j=0; j<TEST_CONDITIONS.length; j++)
					{	var selector = TEST_ELEMS[i]+TEST_CONDITIONS[j];
						if (selector && array_search(selector, test_selectors)==-1)
						{	test_selectors.push(selector);
						}
						selector = 'div div div div div div div div div div div div div div div div div div div div '+selector;
						if (selector && array_search(selector, test_selectors)==-1)
						{	test_selectors.push(selector);
						}
						for (var k=0; k<TEST_CONDITIONS.length; k++)
						{	var selector = TEST_ELEMS[i]+TEST_CONDITIONS[j]+TEST_CONDITIONS[k];
							if (selector && array_search(selector, test_selectors)==-1)
							{	test_selectors.push(selector);
							}
						}
					}
				}
				test_selectors_hash = strhash(test_selectors.join(';'));
			}
		}

		var h_run_tests = null;
		var h_tests_progress = null;
		var cur_oninterrupt = null;
		var report = null;

		return function(tests_elem, test_repeat_times, onprogress, ondone, oninterrupt, discard_previous)
		{	test_repeat_times = test_repeat_times-0 || 1;
			init_test_selectors();

			if (cur_oninterrupt)
			{	cur_oninterrupt(tests_progress, report);
			}

			clearTimeout(h_run_tests);
			clearInterval(h_tests_progress);
			cur_oninterrupt = oninterrupt;
			report = new Report(test_repeat_times);

			var tests_progress = 0;
			var tests_iter_wait = 20;

			function save_state()
			{	var state =
				{	test_selectors_hash: test_selectors_hash,
					report: report.__sleep()
				};
				var state_json = json_encode(state);
				if (window.sessionStorage)
				{	sessionStorage.tests_state = state_json;
				}
				/*else
				{	var n_chunk = 0;
					var cookies = [];
					var size = 0;
					state_json.replace
					(	/.{1,4000}/g,
						function(chunk)
						{	var data = 'tests_state'+n_chunk+'='+chunk.replace(/;/g, '%3B')+';path=/';
							cookies.push(data);
							size += data.length;
						}
					);
					while (cookies.length < 5)
					{	cookies.push('tests_state'+cookies.length+'=;path=/');
					}
					if (size < 18000) // reserve no more than 18000 bytes for tests state
					{	for (var i=0; i<cookies.length; i++)
						{	document.cookie = cookies[i];
						}
					}
				}*/
			}

			function restore_state()
			{	var data = '';
				if (window.sessionStorage)
				{	data = sessionStorage.tests_state;
				}
				/*else
				{	for (var i=0; i<5; i++)
					{	data += get_cookie('tests_state'+i);
					}
				}*/
				var state = data ? json_decode(data) : null;
				if (state && state.test_selectors_hash==test_selectors_hash && state.report.test_repeat_times==test_repeat_times)
				{	report = new Report().__wakeup(state.report);
					update_progress();
				}
			}

			function run_tests()
			{	clearTimeout(h_run_tests);
				var n_test_iter = report.entries.length;
				if (n_test_iter >= test_selectors.length)
				{	return;
				}
				var result_1=null, time_1=null;
				var result_2=null, time_2=null;
				var result_3=null, time_3=null;
				var error = null;
				// test built-in
				try
				{	var start = new Date().getTime();
					for (var j=0; j<test_repeat_times; j++)
					{	result_1 = tests_elem.querySelectorAll(test_selectors[n_test_iter]);
					}
					time_1 = new Date().getTime() - start;
				}
				catch (e)
				{
				}
				// test emulation
				try
				{	var start = new Date().getTime();
					for (var j=0; j<test_repeat_times; j++)
					{	result_2 = joyquery(test_selectors[n_test_iter], tests_elem, null, false).get();
					}
					time_2 = new Date().getTime() - start;
				}
				catch (e)
				{	error = e.message || e.description;
				}
				// test jQuery
				try
				{	var start = new Date().getTime();
					for (var j=0; j<test_repeat_times; j++)
					{	result_3 = jQuery(test_selectors[n_test_iter], tests_elem);
					}
					time_3 = new Date().getTime() - start;
				}
				catch (e)
				{
				}
				// compare results
				var report_entry =
				{	result: [],
					missing: [],
					extra: [],
					time: time_2,
					time_b: time_1,
					time_j: time_3,
					error: error
				};
				report.entries.push(report_entry);
				if (result_2 && !result_1 && !result_3)
				{	for (var j=0; j<result_2.length; j++)
					{	report_entry.result[j] = result_2[j].id;
					}
				}
				if (result_1)
				{	// missing compared to built-in
					for (var j=0; j<result_1.length; j++)
					{	if (!result_2 || array_search(result_1[j], result_2)==-1)
						{	report_entry.missing.push(result_1[j].id);
						}
					}
					// extra compared to built-in
					for (var j=0; j<(result_2&&result_2.length); j++)
					{	if (!result_1 || array_search(result_2[j], result_1)==-1)
						{	report_entry.extra.push(result_2[j].id);
						}
					}
				}
				else if (result_3)
				{	// missing compared to jQuery
					for (var j=0; j<result_3.length; j++)
					{	if (!result_2 || array_search(result_3[j], result_2)==-1)
						{	report_entry.missing.push(result_3[j].id);
						}
					}
					// extra compared to jQuery
					for (var j=0; j<(result_2&&result_2.length); j++)
					{	if (!result_3 || array_search(result_2[j], result_3)==-1)
						{	report_entry.extra.push(result_2[j].id);
						}
					}
				}
				n_test_iter++;
				if (n_test_iter == test_selectors.length)
				{	clearInterval(h_tests_progress);
					update_progress();
					ondone(report);
				}
				else
				{	h_run_tests = setTimeout(run_tests, tests_iter_wait);
				}
			}

			function update_progress()
			{	tests_progress = report.entries.length==test_selectors.length ? 1 : report.entries.length/test_selectors.length;
				var new_tests_iter_wait = parseInt(onprogress(tests_progress, report, tests_iter_wait));
				if (!isNaN(new_tests_iter_wait))
				{	tests_iter_wait = new_tests_iter_wait;
				}
				save_state();
			}

			if (!discard_previous)
			{	restore_state();
			}
			update_progress();
			if (tests_progress == 1)
			{	ondone(report);
			}
			else
			{	h_tests_progress = setInterval(update_progress, 1000);
				run_tests();
			}
		};
	}
)();
