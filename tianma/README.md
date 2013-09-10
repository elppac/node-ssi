#SSI Webclient

**基于Nodejs，为tianma(v0.5+)服务开发的插件**


##目录构

	alibaba
	|-tmpl
	| |-layout-header.html
	| |-layout-footer.html
	|-index.html

##index.html的代码

	<!--#include file="/alibaba/tmpl/layout-header.html" -->
	hello
	<!--#include file="/alibaba/tmpl/layout-footer.html" -->


##安装方式

1.下载ssi-webclient.js到你的本地目录中 https://github.com/elppac/node-ssi/tree/master/tianma

2.配置到tinama的config.js

	-var 	tianma = require('tianma'),
	-		pipe = tianma.pipe,
			ssi = require('D:/work/html/github/node-ssi/tianma/ssi-webclient');


	-.mount('/', [ // static service
	-	pipe.static({ root: alibaba_dir }),
	-	pipe.proxy({
	-		'http://110.75.216.150/$1': /(?:(?:style|img)\.(?:alibaba|aliexpress)\.com|aliimg\.com)\/(.*)/
	-	}),
	-	pipe.beautify(),
		function( context, next ){
			new ssi({
				request : context.request,
				response : context.response
			},function(){
				next();
			}.bind(this));
		}
	-])

非减号行为ssi的配置代码