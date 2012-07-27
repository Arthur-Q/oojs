/**
baseNamespace是基础命名空间, 上面存放js框架的最基础的初始化命名空间和初始化类的方法.
框架会在window上注册两个变量:
一个是 ___baseNamespaceName , 为基础命名空间的名字.
一个是 window[___baseNamespaceName], 即基础命名空间对象.
___baseNamespaceName 全局变量在后面所有的类上都需要使用.所以必须定义成全局的.
通过修改 ___baseNamespaceName 变量可以修改基础命名空间的变量名.
*/

//基础命名空间变量名
var $baseNamespace = "$baseValue";
    
(function(){
    //基础命名空间变量名
    var baseNamespaceName = $baseNamespace;

    //判断是否在跨域的iframe中. 对于多层iframe嵌套, 只要有一层嵌套是跨域的, 则认为是跨域嵌套.
    //循环时最多10次循环, 如果用户修改了window.top和window.parent, 则会进行10次循环, 当作跨域处理.
    var win = window, counter=0, isInIframe=false, isCrossDomain = false;
    while ((win != window.top || win != win.parent) && counter<10) {
        isInIframe = true;
        try {
            win.parent.location.toString();
        }
        catch (ex) {
            isCrossDomain = true;
            break;
        }
        counter++;
        win = win.parent;
    }
    if(counter>=10){
        isCrossDomain = true;
    }

    //注册基础命名空间的方法
    var registerBaseNamespace = function(baseNamespace, isInIframe, isCrossDomain){
        /**
        是否在iframe中,是否跨域    
        */
        baseNamespace.baseName = baseNamespaceName;
        baseNamespace.isInIframe = isInIframe;
        baseNamespace.isCrossDomain = isCrossDomain;
        baseNamespace.needInitTop = isInIframe && !isCrossDomain;        
        baseNamespace.buildInObject = {
            //buildInObject, 用于处理无法遍历Date等对象的问题
            '[object Function]': 1,
            '[object RegExp]'  : 1,
            '[object Date]'    : 1,
            '[object Error]'   : 1,
            '[object Window]'  : 1
        };
        
        /**
        克隆一个对象,返回它的副本.
        */
        baseNamespace.clone = function(source){
            var result=source,i, len;
            if (!source
                || source instanceof Number
                || source instanceof String
                || source instanceof Boolean) {
                return result;
            } else if (source instanceof Array) {
                result = [];
                var resultLen = 0;
                for (i = 0, len = source.length; i < len; i++) {
                    result[resultLen++] = this.clone(source[i]);
                }
            } else if ('object' === typeof source) {
                if(this.buildInObject[Object.prototype.toString.call(source)]){
                    return result;
                }
                result = {};
                for (i in source) {
                    if (source.hasOwnProperty(i)) {
                        result[i] = this.clone(source[i]);
                    }
                }
            }
            return result;
        }        
        
        /**
        用于创建类的某一个实例
        */
        baseNamespace.create = function(classObj, params){    
            var args = Array.prototype.slice.call(arguments, 0);
            args.shift();
            var tempclassObj = function (args) {
                this.initialize = this.initialize || function(){};
                this.initializeDOM = this.initializeDOM || function(){};
                this.initializeEvent = this.initializeEvent || function(){};
                
                this.initialize.apply(this, args);
                this.initializeDOM.apply(this, args);
                this.initializeEvent.apply(this, args);
            };
            
            tempclassObj.prototype = classObj;  
            var result = new tempclassObj(args);                
            //如果类的某一个属性是对象, 并且具有"modifier=dynamic"属性, 则需要克隆.
            for(var classPropertyName in classObj){
                if( result[classPropertyName]
                    && typeof result[classPropertyName] === "object"
                    && result[classPropertyName].modifier
                    && result[classPropertyName].modifier.indexOf("dynamic")>-1){
                    result[classPropertyName] = this.clone(result[classPropertyName]);
                }
            }
            result.instances = null;
            classObj.instances = classObj.instances || [];
            classObj.instances.push(result);
            return result;
        };
                
        /**
        初始化方法. 将类的属性和方法分离, 每一次都初始化实例的所有方法.
        */
        baseNamespace.registerMethod = function(target, classObj){      
            var methodMapping = {};
            var propertyMapping = {};
            
            //分离obj的属性和方法
            var item, skey, instance;
            for (skey in classObj) {
                item = classObj[skey];
                if (!skey || !item) {
                    continue;
                }
                              
                if(typeof item === "object" && item.modifier && item.modifier === "dynamic"){
                    this.registerMethod( target[skey] ,item);
                }
                else if (typeof item === "function") {
                    methodMapping[skey] = item;
                }
                else {
                    propertyMapping[skey] = item;
                }
            }
            
            //初始化方法
            for (skey in methodMapping) {
                item = methodMapping[skey];
                if (skey && item) {
                    target[skey] = item;
                }
            }
            
            //如果类有实例, 则还需要初始化类的每一个实例
            if(target.instances && target.instances.length && target.instances.length>0){
                for( var i=0, count= target.instances.length; i<count; i++){
                    instance = target.instances[i];
                    this.registerMethod(instance, classObj);
                }
            }           
        }
        
        /**
        创建对象
        */
        baseNamespace.registerObj = function(classObj, params){
            var args = Array.prototype.slice.call(arguments, 0);
            args.shift();
            var tempclassObj = function (args) {
				this.register = this.register || function(){};				
                this.register.apply(this, args);
            };            
            tempclassObj.prototype = classObj;
            tempclassObj.prototype.instances = null;    
            var result = new tempclassObj(args);            
            return result;
        };    
        
        /**
        初始化命名空间, 指定window对象
        */
        baseNamespace.registerNamespaceByWin = function(namespace, win){        
            //要初始化的window对象, 同时初始化namespace类上的win属性.
            var win = namespace.win = win || window;
            
            //拆分fullName, 获取所有前置和当前命名空间的名字
            var fullName = namespace.fullName.replace("$baseName", this.baseName);
            var namespaceNames = fullName.split(".");
            
            //初始化前置命名空间
            var count = namespaceNames.length;
            var currNamespace = win;            
            var firstName;
            for(var i=0; i<count-1; i++){
                var tempName = namespaceNames[i];
                if(currNamespace == win){//第一个命名空间,需要特殊处理
                    currNamespace[tempName]  = win[tempName] = win[tempName] || {};
                    firstName = tempName;
                    namespace.baseName = firstName;
                }
                else{
                    currNamespace[tempName] = currNamespace[tempName] || {};
                }                
                currNamespace = currNamespace[tempName];
            }
            
            var targetNamespace = currNamespace[namespaceNames[count-1]] || {};
            if(targetNamespace.fullName && targetNamespace.version){    //已经初始化过, 需要保存原始的静态变量
                this.registerMethod(targetNamespace, namespace);        //初始化namespace的function方法
            }
            else{                                                        //没有初始化过
                targetNamespace = this.registerObj(namespace);           //创建命名空间
                targetNamespace.instances = null;                        //命名空间不需要记录实例引用
                currNamespace[namespaceNames[count-1]] = targetNamespace;                
            }        
        };
        
        /**
        初始化命名空间
        */
        baseNamespace.registerNamespace = function(namespace){
            if(!namespace || !namespace.fullName || !namespace.version){
                return;
            }        
            
            this.registerNamespaceByWin(namespace, window);
            if(this.needInitTop){
                this.registerNamespaceByWin(namespace, window.top);
            }
        };        

        /**
        初始化类
        */
        baseNamespace.registerClass = baseNamespace.registerNamespace;   

        /**
        创建命名空间的简短引用:
        var U = G.using("Utility");
        */
        baseNamespace.using = function(name, win){
            var result;            
            if( !win && this.isInIframe && !this.isCrossDomain && top 
				&& typeof top ==="object" && top.document && "setInterval" in top){
                win = top;
            }
			else{
				win = win || window;
			}
            
			name = name.replace("$baseName", this.baseName);
            var nameArray = name.split(".");
            result = win[nameArray[0]];
            for(var i=1, count=nameArray.length; i<count; i++){
                if(result && result[nameArray[i]]){
                    result = result[nameArray[i]];
                }
                else{
                    result = null;
                }
            }
            return result;
        }
    }
    
    //在window和top上(非跨域iframe)注册基础命名空间
    window[baseNamespaceName] = window[baseNamespaceName] || {};
    registerBaseNamespace(window[baseNamespaceName], isInIframe, isCrossDomain);
	//如果在iframe中, 非跨域, 并且top对象没有被修改, 则需要在window.top上注册.
    if(isInIframe && !isCrossDomain){
		window.top[baseNamespaceName] = window.top[baseNamespaceName] || {};
		registerBaseNamespace(window.top[baseNamespaceName], isInIframe, isCrossDomain)
    }
})();

