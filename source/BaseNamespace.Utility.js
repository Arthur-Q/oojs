///@import BaiduCproNamespace

(function(G) {
	// 声明命名空间
	var UtilityNamespace = {
		fullName : "$baseName.Utility",
		version : "1.0.0",
		register : function() {
			// 获取浏览器信息.
			// IE 8下，以documentMode为准
			// 在百度模板中，可能会有$，防止冲突，将$1 写成 \x241
			this.browser = this.browser || {};
			if (/msie (\d+\.\d)/i.test(navigator.userAgent)) {
				this.browser.ie = document.documentMode || +RegExp['\x241'];
			}
			if (/opera\/(\d+\.\d)/i.test(navigator.userAgent)) {
				this.browser.opera = +RegExp['\x241'];
			}
			if (/firefox\/(\d+\.\d)/i.test(navigator.userAgent)) {
				this.browser.firefox = +RegExp['\x241'];
			}
			if (/(\d+\.\d)?(?:\.\d)?\s+safari\/?(\d+\.\d+)?/i
					.test(navigator.userAgent)
					&& !/chrome/i.test(navigator.userAgent)) {
				this.browser.safari = +(RegExp['\x241'] || RegExp['\x242']);
			}
			if (/chrome\/(\d+\.\d)/i.test(navigator.userAgent)) {
				this.browser.chrome = +RegExp['\x241'];
			}
			try {
				if (/(\d+\.\d)/.test(window["external"].max_version)) {
					this.browser.maxthon = +RegExp['\x241'];
				}
			} catch (ex) {
			}
			this.browser.isWebkit = /webkit/i.test(navigator.userAgent);
			this.browser.isGecko = /gecko/i.test(navigator.userAgent)
					&& !/like gecko/i.test(navigator.userAgent);
			this.browser.isStrict = document.compatMode == "CSS1Compat";
		},
		/**
		 * 保存用户浏览器的信息, 在register中对browser属性赋值
		 */
		browser : {},

		/**
		 * 判断传入的win是否是window对象. 如果win对象不可访问(比如跨域iframe中的top),则认为其不是window对象.
		 */
		isWindow : function(win) {
			var result = false;
			try {
				if (win && typeof win === "object" && win.document
						&& "setInterval" in win) {
					result = true;
				}
			} catch (ex) {
				result = false;
			}
			return result;
		},

		/**
		 * 判断当前窗口是否包含在Iframe中
		 * 
		 * @name this.isInIframe
		 * @function
		 * @grammar this.isInIframe([win])
		 * @param {Window}
		 *            win 要检测的window对象，不传递则为脚本执行时的window对象。
		 * @meta cpro
		 * 
		 * @return {Boolean} true表示当前窗口包含在iframe中。
		 */
		isInIframe : function(win) {
			win = win || window;
			return win != window.top && win != win.parent;
		},

		/**
		 * 判断win对象是否包含在跨域的iframe中.如果同时传递win和topWin，则只判断win和topWin之间是否跨域。
		 * 
		 * @name this.isCrossDomain
		 * @function
		 * @grammar this.isCrossDomain([win][, topWin])
		 * @param {Window}
		 *            win 要检测的window对象，默认为当前窗口的window。
		 * @param {Window}
		 *            topWin 父窗口window对象，默认为top
		 * @meta cpro
		 * 
		 * @return {Boolean} true表示win与topWin存在跨域
		 */
		isInCrossDomainIframe : function(win, another) {
			var result = false;
			win = win || window;
			another = another || window.top;

			var count = 0;

			// 检查top和parent对象是否被篡改.
			if (!this.isWindow(another) || !this.isWindow(another.parent)) {
				result = true;
			} else {
				while ((win != another) && count < 10) {
					count++;
					// 每次循环依然需要检查top和parent对象是否被篡改.
					if (this.isWindow(win) && this.isWindow(win.parent)) {
						// top和parent没有被修改
						try {
							win.parent.location.toString();
						} catch (ex) {
							result = true;
							break;
						}
					} else {
						// top或parent对象被修改, 认为是跨域iframe调用.
						result = true;
						break;
					}
					win = win.parent;
				}
			}

			if (count >= 10) {
				// 如果嵌套层数大于10层, 认为是跨域iframe调用
				result = true;
			}
			return result;
		},

		/**
		 * 从文档中获取指定的DOM元素
		 * 
		 * @name Utility.g
		 * @function
		 * @grammar Utility.g(id)
		 * @param {string|HTMLElement}
		 *            id 元素的id或DOM元素
		 * @shortcut g,G
		 * @meta standard
		 * 
		 * @returns {HTMLElement|null} 获取的元素，查找不到时返回null,如果参数不合法，直接返回参数
		 */
		g : function(id, win) {
			win = win || window;
			if ('string' === typeof id || id instanceof String) {
				return win.document.getElementById(id);
			} else if (id && id.nodeName
					&& (id.nodeType == 1 || id.nodeType == 9)) {
				return id;
			}
			return id;
		},
        
        /*
         * 通过请求一个图片的方式令服务器存储一条日志
         * @param   {string}    url 要发送的地址.
         */
        sendRequestViaImage : function(url, win) {
            var img = new Image();
            var key = 'cpro_log_' +
                Math.floor(Math.random() * 2147483648).toString(36);
            
            win = win || window;
            // 这里一定要挂在window下
            // 在IE中，如果没挂在window下，这个img变量又正好被GC的话，img的请求会abort
            // 导致服务器收不到日志
            win[key] = img;
         
            img.onload = img.onerror = img.onabort = function() {
                // 下面这句非常重要
                // 如果这个img很不幸正好加载了一个存在的资源，又是个gif动画
                // 则在gif动画播放过程中，img会多次触发onload
                // 因此一定要清空
                img.onload = img.onerror = img.onabort = null;
         
                win[key] = null;
         
                // 下面这句非常重要
                // new Image创建的是DOM，DOM的事件中形成闭包环引用DOM是典型的内存泄露
                // 因此这里一定要置为null
                img = null;
            };
         
            // 一定要在注册了事件之后再设置src
            // 不然如果图片是读缓存的话，会错过事件处理
            // 最后，对于url最好是添加客户端时间来防止缓存
            // 同时服务器也配合一下传递Cache-Control: no-cache;
            img.src = url;
        },

		// @delete {
		/**
		 * 获取目标元素所属的document对象
		 * 
		 * @name Utility.getDocument
		 * @function
		 * @grammar Utility.getDocument(element)
		 * @param {HTMLElement|string}
		 *            element 目标元素或目标元素的id
		 * @meta standard
		 * 
		 * @returns {HTMLDocument} 目标元素所属的document对象
		 */
		getDocument : function(element) {
			if (!element)
				return document;
			element = this.g(element);
			return element.nodeType == 9 ? element : element.ownerDocument
					|| element.document;
		},

		/**
		 * 获取元素所在的window对象
		 */
		getWindow : function(element) {
			element = this.g(element);
			var doc = this.getDocument(element);

			// 没有考虑版本低于safari2的情况
			// @see goog/dom/dom.js#goog.dom.DomHelper.prototype.getWindow
			return doc.parentWindow || doc.defaultView || null;
		},

		/**
		 * 获取最顶层的window对象. 如果window在跨域iframe中, 或者top对象被修改, 则返回window本身
		 */
		getTopWindow : function(win) {
			win = win || window;
			if (this.isInIframe(win)
					&& !this.isInCrossDomainIframe(win, win.top)
					&& this.isWindow(win.top)) {
				// 在iframe中, 非跨域, top是window对象
				return win.top
			}
			return win;
		},

		/**
		 * 绑定事件
		 */
		bind : function(element, type, listener) {
			element = this.g(element);
			type = type.replace(/^on/i, '').toLowerCase();

			// 事件监听器挂载
			if (element.addEventListener) {
				element.addEventListener(type, listener, false);
			} else if (element.attachEvent) {
				element.attachEvent('on' + type, listener);
			}
			return element;
		},
		/**
		 * 移除事件
		 */
		unBind : function(element, type, listener) {
			element = this.g(element);
			type = type.replace(/^on/i, '').toLowerCase();

			// 事件监听器挂载
			if (element.removeEventListener) {
				element.removeEventListener(type, listener, false);
			} else if (element.detachEvent) {
				element.detachEvent('on' + type, listener);
			}
			return element;
		},

		// @delete }

		/**
		 * proxy函数用于修改函数的this指向。
		 */
		proxy : function(fn, context, args) {
			var method = fn;
			var thisObj = context;
			return function() {
				if (args && args.length) {
					return method.apply(thisObj || {}, args);
				} else {
					return method.apply(thisObj || {}, arguments);
				}
			};
		},

		// @delete {
		/**
		 * 获取目标元素的样式值
		 * 
		 * @returns {string} 目标元素的样式值
		 */
		getStyle : function(element, styleName) {
			var result;
			element = this.g(element);
			var doc = this.getDocument(element);
			// ie9下获取到的样式名称为: backgroundColor
			// 其他标准浏览器下样式为: background-color
			// 分别使用这两个名字尝试获取样式信息
			var styleNameOther = "";
			if (styleName.indexOf("-") > -1) {
				styleNameOther = styleName.replace(/[-_][^-_]{1}/g, function(
								match) {
							return match.charAt(1).toUpperCase();
						});
			} else {
				styleNameOther = styleName.replace(/[A-Z]{1}/g,
						function(match) {
							return "-" + match.charAt(0).toLowerCase();
						});
			}

			// 优先使用w3c标准的getComputedStyle方法, 在ie6,7,8下使用currentStyle
			var elementStyle;
			if (doc && doc.defaultView && doc.defaultView.getComputedStyle) {
				elementStyle = doc.defaultView.getComputedStyle(element, null);
				if (elementStyle) {
					result = elementStyle.getPropertyValue(styleName);
				}
				if (typeof result !== "boolean" && !result) {
					result = elementStyle.getPropertyValue(styleNameOther);
				}
			} else if (element.currentStyle) { // ie6,7,8使用currentStyle
				elementStyle = element.currentStyle;
				if (elementStyle) {
					result = elementStyle[styleName];
				}
				if (typeof result !== "boolean" && !result) {
					result = elementStyle[styleNameOther];
				}
			}

			return result;
		},

		/**
		 * 获取元素相对于页面左上角的坐标
		 */
		getPositionCore : function(element) {
			element = this.g(element);
			var doc = this.getDocument(element), browser = this.browser,
			// Gecko 1.9版本以下用getBoxObjectFor计算位置
			// 但是某些情况下是有bug的
			// 对于这些有bug的情况
			// 使用递归查找的方式
			BUGGY_GECKO_BOX_OBJECT = browser.isGecko > 0 && doc.getBoxObjectFor
					&& this.getStyle(element, 'position') == 'absolute'
					&& (element.style.top === '' || element.style.left === ''), pos = {
				"left" : 0,
				"top" : 0
			}, viewport = (browser.ie && !browser.isStrict)
					? doc.body
					: doc.documentElement, parent, box;

			if (element == viewport) {
				return pos;
			}

			if (element.getBoundingClientRect) { // IE and Gecko 1.9+

				// 当HTML或者BODY有border width时, 原生的getBoundingClientRect返回值是不符合预期的
				// 考虑到通常情况下 HTML和BODY的border只会设成0px,所以忽略该问题.
				box = element.getBoundingClientRect();

				pos.left = Math.floor(box.left)
						+ Math.max(doc.documentElement.scrollLeft,
								doc.body.scrollLeft);
				pos.top = Math.floor(box.top)
						+ Math.max(doc.documentElement.scrollTop,
								doc.body.scrollTop);

				// IE会给HTML元素添加一个border，默认是medium（2px）
				// 但是在IE 6 7 的怪异模式下，可以被html { border: 0; } 这条css规则覆盖
				// 在IE7的标准模式下，border永远是2px，这个值通过clientLeft 和 clientTop取得
				// 但是。。。在IE 6 7的怪异模式，如果用户使用css覆盖了默认的medium
				// clientTop和clientLeft不会更新
				pos.left -= doc.documentElement.clientLeft;
				pos.top -= doc.documentElement.clientTop;

				var htmlDom = doc.body,
				// 在这里，不使用element.style.borderLeftWidth，只有computedStyle是可信的
				htmlBorderLeftWidth = parseInt(this.getStyle(htmlDom,
						'borderLeftWidth')), htmlBorderTopWidth = parseInt(this
						.getStyle(htmlDom, 'borderTopWidth'));
				if (browser.ie && !browser.isStrict) {
					pos.left -= isNaN(htmlBorderLeftWidth)
							? 2
							: htmlBorderLeftWidth;
					pos.top -= isNaN(htmlBorderTopWidth)
							? 2
							: htmlBorderTopWidth;
				}
				/*
				 * 因为firefox 3.6和4.0在特定页面下(场景待补充)都会出现1px偏移,所以暂时移除该逻辑分支 如果
				 * 2.0版本时firefox仍存在问题,该逻辑分支将彻底移除. by rocy 2011-01-20 } else if
				 * (doc.getBoxObjectFor && !BUGGY_GECKO_BOX_OBJECT){ // gecko
				 * 1.9-
				 *  // 1.9以下的Gecko，会忽略ancestors的scroll值 //
				 * https://bugzilla.mozilla.org/show_bug.cgi?id=328881 and //
				 * https://bugzilla.mozilla.org/show_bug.cgi?id=330619
				 * 
				 * box = doc.getBoxObjectFor(element); var vpBox =
				 * doc.getBoxObjectFor(viewport); pos.left = box.screenX -
				 * vpBox.screenX; pos.top = box.screenY - vpBox.screenY;
				 */
			} else { // safari/opera/firefox
				parent = element;

				do {
					pos.left += parent.offsetLeft;
					pos.top += parent.offsetTop;

					// safari里面，如果遍历到了一个fixed的元素，后面的offset都不准了
					if (browser.isWebkit > 0
							&& this.getStyle(parent, 'position') == 'fixed') {
						pos.left += doc.body.scrollLeft;
						pos.top += doc.body.scrollTop;
						break;
					}

					parent = parent.offsetParent;
				} while (parent && parent != element);

				// 对body offsetTop的修正
				if (browser.opera > 0
						|| (browser.isWebkit > 0 && this.getStyle(element,
								'position') == 'absolute')) {
					pos.top -= doc.body.offsetTop;
				}

				// 计算除了body的scroll
				parent = element.offsetParent;
				while (parent && parent != doc.body) {
					pos.left -= parent.scrollLeft;
					// see https://bugs.opera.com/show_bug.cgi?id=249965
					// if (!b.opera || parent.tagName != 'TR') {
					if (!browser.opera || parent.tagName != 'TR') {
						pos.top -= parent.scrollTop;
					}
					parent = parent.offsetParent;
				}
			}

			return pos;
		},

		/**
		 * 如果目标元素在Iframe中，获取目标元素相对于顶层文档(或第一个非跨域的iframe)左上角的位置
		 * 
		 * @name this.getPosition
		 * @function
		 * @grammer this.getPosition(element)
		 * @param {HTMLElement|string}
		 *            element 目标元素或目标元素的id
		 * @meta Cpro
		 * 
		 * @return {Object} 目标元素的位置，包含键值top和left的Object对象
		 */
		getPosition : function(id, win) {
			win = win || window;
			var element = this.g(id, win);
			if (!element)
				return;
			var result = this.getPositionCore(element); // 获取DOM元素在当前window上的位置
			var tempPos; // 从当前DOM的window开始累加top和left偏移量
			var maxCount = 10, count = 0;
			while (win != win.parent && count < maxCount) {
				count++;
				tempPos = {
					top : 0,
					left : 0
				};
				if (!this.isInCrossDomainIframe(win, win.parent)
						&& win.frameElement) {
					tempPos = this.getPositionCore(win.frameElement);
				} else {
					break;
				}
				result.left += tempPos.left;
				result.top += tempPos.top;
				win = win.parent;
			}
			return result;

		},

		/**
		 * 获取元素的宽度，包含padding和border，可选是否包含margin（默认为false不包含）
		 * 
		 * @name this.getOuterWidth
		 * @function
		 * @grammar this.getOuterWidth(element[,includeMargin])
		 * @param {HTMLElement|string}
		 *            element 目标元素或目标元素的id
		 * @param {Boolean}
		 *            includeMargin 是否包含margin，默认为false不包含。
		 * @meta cpro
		 * 
		 * @return {number} 元素宽度值
		 */
		getOuterWidth : function(element, includeMargin) {
			element = this.g(element); // 获取DOM元素
			includeMargin = includeMargin || false;
			var result = element.offsetWidth;
			if (includeMargin) {
				var marginLeft = this.getStyle(element, "marginLeft")
						.toString().toLowerCase().replace("px", "").replace(
								"auto", "0");
				var marginRight = this.getStyle(element, "marginRight")
						.toString().toLowerCase().replace("px", "").replace(
								"auto", "0");
				result = result + parseInt(marginLeft || 0)
						+ parseInt(marginRight || 0);
			}
			return result;
		},

		/**
		 * 获取元素的高度，包含padding和border，可选是否包含margin（默认为false不包含）
		 * 
		 * @name this.getOuterHeight
		 * @function
		 * @grammar this.getOuterHeight(element[,includeMargin])
		 * @param {HTMLElement|string}
		 *            element 目标元素或目标元素的id
		 * @param {Boolean}
		 *            includeMargin 是否包含margin，默认为false不包含。
		 * @meta cpro
		 * 
		 * @return {number} 元素高度值
		 */
		getOuterHeight : function(element, includeMargin) {
			element = this.g(element); // 获取DOM元素
			includeMargin = includeMargin || false;
			var result = element.offsetHeight;
			if (includeMargin) {
				var marginTop = this.getStyle(element, "marginTop").toString()
						.toLowerCase().replace("px", "").replace("auto", "0");
				var marginBottom = this.getStyle(element, "marginBottom")
						.toString().toLowerCase().replace("px", "").replace(
								"auto", "0");
				result = result + parseInt(marginTop || 0)
						+ parseInt(marginBottom || 0);
			}
			return result;
		},

		/**
		 * 如果存在iframe嵌套，则返回DOM对象最外层的Iframe容器对象。如果不包含iframe嵌套或者在跨域的iframe中，则直接返回DOM对象本身。
		 * 
		 * @name this.getTopIframe
		 * @function
		 * @grammar this.getTopIframe("elemID")
		 * @param {string|HTMLElement}
		 *            id 元素的id或DOM元素
		 * @meta cpro
		 * 
		 * @return {Boolean}
		 *         如果存在iframe嵌套，则返回DOM对象最外层的Iframe容器对象。如果不包含iframe嵌套或者在跨域的iframe中，则直接返回DOM对象本身。
		 */
		getTopIframe : function(id) {
			var result = this.g(id);
			var currWin = this.getWindow(result);
			var count = 0;
			if (this.isInIframe(window) && !this.isInCrossDomainIframe(window)) {
				while (currWin.parent != window.top && count < 10) {
					count++;
					currWin = currWin.parent;
				}
				if (count < 10) {
					result = currWin.frameElement || result;
				}
			}
			return result;
		},

		/**
		 * 获取元素在其所属window中的透明度，不会计算iframe嵌套的透明度。
		 * div嵌套时，IE中filter透明度不会累加（如两个50%透明度嵌套，结果还是50）。FF等其浏览器会累加（如两个50%透明度嵌套，结果是25）
		 * 
		 * @name this.getOpacityInWin
		 * @function
		 * @grammar this.getOpacityInWin("elemID")
		 * @param {string|HTMLElement}
		 *            id 元素的id或DOM元素
		 * @meta cpro
		 * 
		 * @return {number} 0-100的透明度值。
		 */
		getOpacityInWin : function(id) {
			var domElement = this.g(id);
			var win = this.getWindow(domElement);
			var result = 100;

			var node = domElement;
			var nodeOpacity;
			try {
				while (node && node.tagName) {
					nodeOpacity = 100;
					if (this.browser.ie) {
						if (this.browser.ie > 5) {
							try {
								nodeOpacity = node.filters.alpha.opacity || 100;
							} catch (e) {
							}
						}
						result = result > nodeOpacity ? nodeOpacity : result;
					} else {
						try {
							nodeOpacity = (win.getComputedStyle(node, null).opacity || 1)
									* 100;
						} catch (e) {
						}
						result = result * (nodeOpacity / 100);
					}

					node = node.parentNode;
				}
			} catch (ex) {
			}

			return result || 100;
		},

		/**
		 * 获取元素的透明度，如果元素嵌套在非跨域Iframe中，并尝试计算iframe的透明度并累加。
		 * 
		 * @name this.getOpacity
		 * @function
		 * @grammar this.getOpacity("elemID")
		 * @param {string|HTMLElement}
		 *            id 元素的id或DOM元素
		 * @meta cpro
		 * 
		 * @return {number} 0-100的透明度值。
		 */
		getOpacity : function(id) {
			var domElement = this.g(id);
			var win = this.getWindow(domElement);
			var result = this.getOpacityInWin(domElement);
			var tempOpacity = 100;
			var count = 0, maxCount = 10;
			while (this.isInIframe(win)) {
				count++;
				if (!this.isInCrossDomainIframe(win, win.parent)) {
					tempOpacity = 100;
					if (win.frameElement) {
						tempOpacity = this.getOpacityInWin(win.frameElement);
					}
					result = result * (tempOpacity / 100);
				} else {
					break;
				}
				win = win.parent;
			}
			return result;
		},

		/**
		 * 对Date的扩展，将 Date 转化为指定格式的String
		 * 月(M)、日(d)、12小时(h)、24小时(H)、分(m)、秒(s)、周(E)、季度(q) 可以用 1-2 个占位符 年(y)可以用
		 * 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) eg: (new
		 * Date()).pattern("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
		 * (new Date()).pattern("yyyy-MM-dd E HH:mm:ss") ==> 2009-03-10 二
		 * 20:09:04 (new Date()).pattern("yyyy-MM-dd EE hh:mm:ss") ==>
		 * 2009-03-10 周二 08:09:04 (new Date()).pattern("yyyy-MM-dd EEE
		 * hh:mm:ss") ==> 2009-03-10 星期二 08:09:04 (new Date()).pattern("yyyy-M-d
		 * h:m:s.S") ==> 2006-7-2 8:9:4.18
		 */
		dateToString : function(dateObj, formatString) {
			var o = {
				"M+" : dateObj.getMonth() + 1, // 月份
				"d+" : dateObj.getDate(), // 日
				"h+" : dateObj.getHours() % 12 == 0 ? 12 : dateObj.getHours()
						% 12, // 小时
				"H+" : dateObj.getHours(), // 小时
				"m+" : dateObj.getMinutes(), // 分
				"s+" : dateObj.getSeconds(), // 秒
				"q+" : Math.floor((dateObj.getMonth() + 3) / 3), // 季度
				"S" : dateObj.getMilliseconds()
				// 毫秒
			};
			var week = {
				"0" : "\u65e5",
				"1" : "\u4e00",
				"2" : "\u4e8c",
				"3" : "\u4e09",
				"4" : "\u56db",
				"5" : "\u4e94",
				"6" : "\u516d"
			};
			if (/(y+)/.test(formatString)) {
				formatString = formatString.replace(RegExp.$1, (dateObj
								.getFullYear() + "").substr(4
								- RegExp.$1.length));
			}
			if (/(E+)/.test(formatString)) {
				formatString = formatString.replace(RegExp.$1,
						((RegExp.$1.length > 1) ? (RegExp.$1.length > 2
								? "\u661f\u671f"
								: "\u5468") : "")
								+ week[dateObj.getDay() + ""]);
			}
			for (var k in o) {
				if (new RegExp("(" + k + ")").test(formatString)) {
					formatString = formatString.replace(RegExp.$1,
							(RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k])
									.substr(("" + o[k]).length)));
				}
			}
			return formatString;
		},

		/**
		 * 将对象{a:1, b:2}序列化成“a=1&b=2”形式的字符串
		 */
		param : function(obj, mapper) {
			var result = new Array(), tempKey, tempValue, tempIsAdd;
			for (var key in obj) {
				tempIsAdd = true;
				if (mapper) {
					tempKey = mapper[key] ? mapper[key] : key;
					tempIsAdd = mapper[key] ? true : false;
				}
				if (!tempIsAdd) {
					continue;
				}

				var tempValue = obj[key];
				switch (typeof tempValue) {
					case "string" :
					case "number" :
						result.push(tempKey + "=" + tempValue.toString());
						break;
					case "boolean" :
						result.push(tempKey + "=" + (tempValue ? "1" : "0"));
						break;
					case "object" :
						if (tempValue instanceof Date) {
							result.push(tempKey
									+ "="
									+ this.dateToString(tempValue,
											"yyyyMMddhhmmssS"));
						}
						break;
					default :
						break;
				}
			}
			return result.join("&");
		},

		/**
		 * 获取数组的长度或者对象的属性个数
		 * 
		 * @name this.getLength
		 * @function
		 * @grammar this.getLength(obj)
		 * @param {Object|Array}
		 *            id 元素的id或DOM元素
		 * @meta cpro
		 * 
		 * @return {number} 数组的长度或者对象的属性个数
		 */
		getLength : function(obj) {
			var result = 0;
			if (typeof obj === "object") {
				if (obj instanceof Array) {
					result = obj.length;
				} else {
					var i;
					for (i in obj) {
						if (i)
							result++;
					}
				}
			}
			return result;
		},

		/**
		 * 计算MD5值
		 * 
		 * @name this.md5
		 * @function
		 * @grammer var md5Value = this.md5("aabbccc");
		 * @param {String}
		 *            要生成MD5签名的字符串
		 * @meta cpro
		 * 
		 * @return {String} MD5签名值
		 */
		md5 : function(string) {

			function RotateLeft(lValue, iShiftBits) {
				return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
			}

			function AddUnsigned(lX, lY) {
				var lX4, lY4, lX8, lY8, lResult;
				lX8 = (lX & 0x80000000);
				lY8 = (lY & 0x80000000);
				lX4 = (lX & 0x40000000);
				lY4 = (lY & 0x40000000);
				lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
				if (lX4 & lY4) {
					return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
				}
				if (lX4 | lY4) {
					if (lResult & 0x40000000) {
						return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
					} else {
						return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
					}
				} else {
					return (lResult ^ lX8 ^ lY8);
				}
			}

			function F(x, y, z) {
				return (x & y) | ((~x) & z);
			}
			function G(x, y, z) {
				return (x & z) | (y & (~z));
			}
			function H(x, y, z) {
				return (x ^ y ^ z);
			}
			function I(x, y, z) {
				return (y ^ (x | (~z)));
			}

			function FF(a, b, c, d, x, s, ac) {
				a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
				return AddUnsigned(RotateLeft(a, s), b);
			};

			function GG(a, b, c, d, x, s, ac) {
				a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
				return AddUnsigned(RotateLeft(a, s), b);
			};

			function HH(a, b, c, d, x, s, ac) {
				a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
				return AddUnsigned(RotateLeft(a, s), b);
			};

			function II(a, b, c, d, x, s, ac) {
				a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
				return AddUnsigned(RotateLeft(a, s), b);
			};

			function ConvertToWordArray(string) {
				var lWordCount;
				var lMessageLength = string.length;
				var lNumberOfWords_temp1 = lMessageLength + 8;
				var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64))
						/ 64;
				var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
				var lWordArray = Array(lNumberOfWords - 1);
				var lBytePosition = 0;
				var lByteCount = 0;
				while (lByteCount < lMessageLength) {
					lWordCount = (lByteCount - (lByteCount % 4)) / 4;
					lBytePosition = (lByteCount % 4) * 8;
					lWordArray[lWordCount] = (lWordArray[lWordCount] | (string
							.charCodeAt(lByteCount) << lBytePosition));
					lByteCount++;
				}
				lWordCount = (lByteCount - (lByteCount % 4)) / 4;
				lBytePosition = (lByteCount % 4) * 8;
				lWordArray[lWordCount] = lWordArray[lWordCount]
						| (0x80 << lBytePosition);
				lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
				lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
				return lWordArray;
			};

			function WordToHex(lValue) {
				var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
				for (lCount = 0; lCount <= 3; lCount++) {
					lByte = (lValue >>> (lCount * 8)) & 255;
					WordToHexValue_temp = "0" + lByte.toString(16);
					WordToHexValue = WordToHexValue
							+ WordToHexValue_temp.substr(
									WordToHexValue_temp.length - 2, 2);
				}
				return WordToHexValue;
			};

			function Utf8Encode(string) {
				string = string.replace(/\r\n/g, "\n");
				var utftext = "";

				for (var n = 0; n < string.length; n++) {

					var c = string.charCodeAt(n);

					if (c < 128) {
						utftext += String.fromCharCode(c);
					} else if ((c > 127) && (c < 2048)) {
						utftext += String.fromCharCode((c >> 6) | 192);
						utftext += String.fromCharCode((c & 63) | 128);
					} else {
						utftext += String.fromCharCode((c >> 12) | 224);
						utftext += String.fromCharCode(((c >> 6) & 63) | 128);
						utftext += String.fromCharCode((c & 63) | 128);
					}

				}

				return utftext;
			};

			var x = Array();
			var k, AA, BB, CC, DD, a, b, c, d;
			var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
			var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
			var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
			var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

			string = Utf8Encode(string);

			x = ConvertToWordArray(string);

			a = 0x67452301;
			b = 0xEFCDAB89;
			c = 0x98BADCFE;
			d = 0x10325476;

			for (k = 0; k < x.length; k += 16) {
				AA = a;
				BB = b;
				CC = c;
				DD = d;
				a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
				d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
				c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
				b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
				a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
				d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
				c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
				b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
				a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
				d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
				c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
				b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
				a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
				d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
				c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
				b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
				a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
				d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
				c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
				b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
				a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
				d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
				c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
				b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
				a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
				d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
				c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
				b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
				a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
				d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
				c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
				b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
				a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
				d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
				c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
				b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
				a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
				d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
				c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
				b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
				a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
				d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
				c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
				b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
				a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
				d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
				c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
				b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
				a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
				d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
				c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
				b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
				a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
				d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
				c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
				b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
				a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
				d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
				c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
				b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
				a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
				d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
				c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
				b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
				a = AddUnsigned(a, AA);
				b = AddUnsigned(b, BB);
				c = AddUnsigned(c, CC);
				d = AddUnsigned(d, DD);
			}

			var fixedLength = function(source) {
				var result = source;
				for (var i = 0, count = 8 - source.length; i < count; i++) {
					result = "0" + result;
				}
				return result;
			}

			var hightBit = ((parseInt("0x" + WordToHex(a), 16) + parseInt("0x"
							+ WordToHex(b), 16)) % 4294967296).toString(16);
			var lowBit = ((parseInt("0x" + WordToHex(c), 16) + parseInt("0x"
							+ WordToHex(d), 16)) % 4294967296).toString(16);

			if (hightBit.length < 8) {
				hightBit = fixedLength(hightBit);
			}
			if (lowBit.length < 8) {
				lowBit = fixedLength(lowBit);
			}

			return hightBit + lowBit;
		},

		/**
		 * 获取窗口的宽度(含滚动条)
		 * 
		 * @name this.getScrollWidth
		 * @function
		 * @grammer var width = this.getScrollWidth(window);
		 * @param {window}
		 *            window对象. 不传递则默认为当前窗口的window对象
		 * @meta cpro
		 * 
		 * @return {number} 页面的总宽度
		 */
		getScrollWidth : function(win) {
			try {
				win = win || window;
				if (win.document.compatMode === "BackCompat") {
					return win.document.body.scrollWidth;
				} else {
					return win.document.documentElement.scrollWidth;
				}
			} catch (e) {
				return 0;
			}
		},

		/**
		 * 获取窗口的高度(含滚动条)
		 * 
		 * @name this.getScrollWidth
		 * @function
		 * @grammer var width = this.getScrollWidth(window);
		 * @param {window}
		 *            window对象. 不传递则默认为当前窗口的window对象
		 * @meta cpro
		 * 
		 * @return {number} 页面的总高度
		 */
		getScrollHeight : function(win) {
			try {
				win = win || window;
				if (win.document.compatMode === "BackCompat") {
					return win.document.body.scrollHeight;
				} else {
					return win.document.documentElement.scrollHeight;
				}
			} catch (e) {
				return 0;
			}
		},

		// @delete }

		/**
		 * 获得浏览器可视区域宽
		 */
		getClientWidth : function(win) {
			try {
				win = win || window;
				if (win.document.compatMode === "BackCompat")
					return win.document.body.clientWidth;
				else
					return win.document.documentElement.clientWidth;
			} catch (e) {
				return 0;
			}
		},

		/**
		 * 获得浏览器可视区域高
		 */
		getClientHeight : function(win) {
			try {
				win = win || window;
				if (win.document.compatMode === "BackCompat")
					return win.document.body.clientHeight;
				else
					return win.document.documentElement.clientHeight;
			} catch (e) {
				return 0;
			}
		},

		// @delete {

		/**
		 * 获取纵向滚动量
		 */
		getScrollTop : function(win) {
			win = win || window;
			var d = win.document;
			return window.pageYOffset || d.documentElement.scrollTop
					|| d.body.scrollTop;
		},

		/**
		 * 获取横向滚动量
		 */
		getScrollLeft : function(win) {
			win = win || window;
			var d = win.document;
			return window.pageXOffset || d.documentElement.scrollLeft
					|| d.body.scrollLeft;
		},

		// @delete }
		/**
		 * 将url中的使用escape编码(%u[\d|\w]{4})格式的参数转换为encodeURIComponent格式 eg:
		 * "a=%u4E2D%u56FD"转换后为:"a=%E4%B8%AD%E5%9B%BD"
		 * 
		 * @name this.escapeToEncode
		 * @function
		 * @grammer var url =
		 *          this.escapeToEncode("http://www.baidu.com/?a=%u1234");
		 * @param {string}
		 *            url
		 * @meta cpro
		 * 
		 * @return {string} 参数被转换编码后的url
		 */
		escapeToEncode : function(url) {
			var result = url || "";
			if (result) {
				result = result.replace(/%u[\d|\w]{4}/g, function(word) {
							return encodeURIComponent(unescape(word))
						});
			}
			return result
		},

		// @delete {
		/**
		 * 使用数据格式化字符串模版
		 * 
		 * @example
		 * var template = "<div>{name}-{age}</div>";
		 *    var data = {name:zhangziqiu, age:18};
		 *    var result = this.template(template, data); //output:<div>zhangziqiu-18</div>
		 * @function
		 * @meta cpro
		 * @return {string} 格式化后的字符串
		 */
		template : function(source, data) {
			var regexp = /{(.*?)}/g;
			return source.replace(regexp, function(match, subMatch, index, s) {
						return data[subMatch] || "";
					});
		},

		/**
		 * 将源对象的所有属性拷贝到目标对象中
		 * 
		 * @author erik
		 * @name baidu.object.extend
		 * @function
		 * @grammar baidu.object.extend(target, source)
		 * @param {Object}
		 *            target 目标对象
		 * @param {Object}
		 *            source 源对象
		 * @see baidu.array.merge
		 * @remark
		 * 
		 * 1.目标对象中，与源对象key相同的成员将会被覆盖。<br>
		 * 2.源对象的prototype成员不会拷贝。
		 * 
		 * @shortcut extend
		 * @meta standard
		 * 
		 * @returns {Object} 目标对象
		 */
		extend : function(target, source) {
			for (var p in source) {
				if (source.hasOwnProperty(p)) {
					target[p] = source[p];
				}
			}
			return target;
		},

		/**
		 * 日志记录函数
		 */
		log : function(message, isAdd) {
			isAdd = typeof isAdd === "undefined" ? true : false;
			if (!this.logMsg) {
				this.logMsg = document.getElementById("baiduCproLogMsg");
				if (!this.logMsg)
					return;
			}

			var msgBuilder = new Array();
			if (typeof(message) === "object") {
				for (var key in message) {
					if (key !== "analysisUrl") {
						msgBuilder.push(key + ":" + message[key]);
					}
				}
			} else {
				msgBuilder.push("" + message);
			}

			this.logMsg.innerHTML = isAdd ? this.logMsg.innerHTML : "";
			this.logMsg.innerHTML += msgBuilder.join("<br/>") + "<br/>";
		},

		/**
		 * 获取Cookie
		 */
		getCookieRaw : function(key, win) {
			var result;
			var win = win || window;
			var doc = win.document;
			var reg = new RegExp("(^| )" + key + "=([^;]*)(;|\x24)");
			var regResult = reg.exec(doc.cookie);
			if (regResult) {
				result = regResult[2];
			}
			return result;
		},

		setCookieRaw : function(key, value, options) {
			options = options || {};

			// 计算cookie过期时间
			var expires = options.expires;
			if ('number' == typeof options.expires) {
				expires = new Date();
				expires.setTime(expires.getTime() + options.expires);
			}

			document.cookie = key + "=" + value
					+ (options.path ? "; path=" + options.path : "")
					+ (expires ? "; expires=" + expires.toGMTString() : "")
					+ (options.domain ? "; domain=" + options.domain : "")
					+ (options.secure ? "; secure" : '');
		},

		/**
		 * 将json字符串解析成json对象
		 */
		jsonToObj : function(jsonString) {
			return (new Function("return " + jsonString))();
		},

		/**
		 * 获取url上指定参数的值
		 */
		getUrlQueryValue : function(url, key) {
			if (url && key) {
				var reg = new RegExp("(^|&|\\?|#)" + key + "=([^&]*)(&|\x24)",
						"");
				var match = url.match(reg);
				if (match) {
					return match[2];
				}
			}
			return null;
		},

		/**
		 * Dom Ready Event
		 */
		ready : function(callback, delay, win) {
			win = win || this.win || window;
			var doc = win.document;
			delay = delay || 0;
			this.domReadyMonitorRunTimes = 0;

			// 将时间函数放入数组, 在DomReady时一起执行.
			this.readyFuncArray = this.readyFuncArray || [];
			this.readyFuncArray.push({
						func : callback,
						delay : delay,
						done : false
					});

			// domReadyMonitor为监控进程的事件处理函数
			var domReadyMonitor = this.proxy(function() {
				var isReady = false;
				this.domReadyMonitorRunTimes++;

				// 对于非iframe嵌套的ie6,7,8浏览器, 使用doScroll判断Dom Ready.
                var isInIframe = false;
                try{
                    if(win.frameElement){
                        isInIframe = true;
                    }
                }
                catch(e){
                    isInIframe = true;
                }
				if (this.browser.ie && this.browser.ie < 9 && !isInIframe) {
					try {
						doc.documentElement.doScroll("left");
						isReady = true;
					} catch (e) {
					}
				}
				// 非ie浏览器
				// 如果window.onload和DOMContentLoaded事件都绑定失败,
				// 则使用定时器函数判断readyState.
				else if (doc.readyState === "complete" || this.domContentLoaded) {
					isReady = true;
				}
				// 对于某些特殊页面, 如果readyState永远不能为complete, 设置了一个最大运行时间5分钟.
				// 超过了最大运行时间则销毁定时器.
				// 定时器销毁不影响window.onload和DOMContentLoaded事件的触发.
				else {
					if (this.domReadyMonitorRunTimes > 300000) {
						if (this.domReadyMonitorId) {
							win.clearInterval(this.domReadyMonitorId);
							this.domReadyMonitorId = null;
						}
						return;
					}
				}

				// 执行ready集合中的所有函数
				if (isReady) {
					try {
						if (this.readyFuncArray && this.readyFuncArray.length) {
							for (var i = 0, count = this.readyFuncArray.length; i < count; i++) {
								var item = this.readyFuncArray[i];
								if (!item || !item.func || item.done) {
									continue;
								}
								if (!item.delay) {
									item.done = true;
									item.func();
								} else {
									item.done = true;
									win.setTimeout(item.func, item.delay);
								}
							}
						}
					} catch (ex) {
						throw ex;
					} finally {
						if (this.domReadyMonitorId) {
							win.clearInterval(this.domReadyMonitorId);
							this.domReadyMonitorId = null;
						}
					}
				}
			}, this);

			/**
			 * domContentLoadedHandler直接执行所有ready函数.
			 * 没使用传参的形式是因为ff中的定时器函数会传递一个时间参数.
			 */
			var domContentLoadedHandler = this.proxy(function() {
						this.domContentLoaded = true;
						domReadyMonitor();
					}, this);

			// 启动DomReady监控进程
			if (!this.domReadyMonitorStarted) {
				this.domReadyMonitorStarted = true;
				this.domReadyMonitorId = win.setInterval(domReadyMonitor, 50);
				// Mozilla, Opera and webkit nightlies currently support this
				// event
				if (doc.addEventListener) {
					// Use the handy event callback
					doc.addEventListener("DOMContentLoaded",
							domContentLoadedHandler, false);
					// A fallback to window.onload, that will always work
					win
							.addEventListener("load", domContentLoadedHandler,
									false);
				} else if (doc.attachEvent) {
					// A fallback to window.onload, that will always work
					win.attachEvent("onload", domContentLoadedHandler, false);
				}
			}
		},

		/**
		 * 当前浏览器是否支持fixed
		 */
		canFixed : function() {
			var result = true;
			// ie6即以下版本不支持fixed
			// ie7即以上版本在Qurik模式中不支持fixed
			if (this.browser.ie
					&& (this.browser.ie < 7 || document.compatMode === "BackCompat")) {
				result = false;
			}
			return result;
		},
		/**
		 * 获取请求地址后面的查询参数
		 * 
		 * @name this.getJsPara
		 * @function
		 * @grammar this.getJsPara(src)
		 * @param {String}
		 *            要解析的请求地址
		 * @meta cpro
		 * 
		 * @returns {Object} 返回包含查询参数的对象
		 */
		getPara : function(src) {
			var obj = {};
			if (src && typeof src == 'string' && src.indexOf("?") > -1) {
				var paras = src.split("?")[1].split("&");
				for (var i = 0, len = paras.length; i < len; i++) {
					var tempPara = paras[i].split("=");
					var name = tempPara[0];
					var value = tempPara[1];
					obj[name] = value;
				}
			}
			return obj;
		},

		// @delete }
		noop : function() {
		}
	};

	// 注册命名空间
	G.registerNamespace(UtilityNamespace);

})(window[$baseNamespace]);