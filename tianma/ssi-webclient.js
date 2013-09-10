var fs = require('fs'),
	path = require('path'),
	http = require('http'),
	https = require('https'),
	url = require('url');

var INCLUDE_PATTERN = new RegExp('<!--#include file=[\"|\'](.*?\.html)[\"|\'] -->'),
	I18N_PATTERN = new RegExp('\\$\\!\\{RESOURCE_BUNDLE\\.get\\(.*?\\)\\}','gi'),
	IP_PATTERN = /^(?:\d+\.){3}\d+$/,
	FILE_EXT = [ 'html' , 'htm' ],
	IMAGE_EXT = ['png','jpg','jepg','gif'];

module.exports = ssiWebClient;

function ssiWebClient( config,callback ){
	var config = this.config = marge.call( this, config, {
		request : null,
		response : null,
		tab : false,
		limit : 500,
		debug : false
	});
	this.layer = 0;
	this.callback = callback;
	this.data = config.response.body();
	//页面没有找到
	if( config.response.status() !== 200 ){
		output.call(this,null);
	}
	
	//请求文件扩展名
	var ext = config.request.pathname.replace(/.*[\.\/]/, '').toLowerCase();
	this.isImage = false;
	//扩展名不适合
	if( FILE_EXT.indexOf( ext ) === -1 ){
		if( IMAGE_EXT.indexOf( ext ) > -1 ){
			this.isImage = true;
		}
		output.call(this,null);
	}else{
		var uri = url.parse(config.request.href);
		this.options = {
			hostname : uri.hostname,
			path : uri.path,
			post : uri.post || 80,
			body : config.request.body()
		}
		//this.options.headers.host = options.hostname;
		this.client = uri.protocol === 'https:' ? https : http;
		
		main.call(this);
	}
}

function main(){
	var m = contentMatch.call( this, this.data );
	// console.log('main');
	 // console.dir( m );
	if( m ){
		this.tmplMatch = m;
		send.call( this, m.filepath , contentMatch.bind(this) );
	}
}

function  contentMatch( content ){
	var m = content.match( INCLUDE_PATTERN );
	if( m ){
		return {
			tmpl : m[0],
			filepath : m[1]
		};
	}else{
		html200.call(this);
		return;
	}
}

function send( filepath, onload ){
	var config = this.config,
		tab = this.config['tab'],
		limit = this.config['limit'],
		options = this.options,
		req;
	
	options.path = filepath;
	
	this.layer ++;
	if( this.layer > limit ){
		htmlError500.call( this );
		return;
	} 
	req = this.client.request(options, function (response) {
			var status, 
				head,
				body = [];
			response.on('data', function (chunk) {
				//console.log('------------ send data ---------------');
				body.push(chunk);
			});

			response.on('end', function () {
				//console.log('------------ send end ---------------');
				body = Buffer.concat(body);
				tmplMatch = this.tmplMatch;
				//console.dir( tmplMatch );
				if( tmplMatch ){
					var arr = [];
					tab && arr.push('<!--' + tmplMatch.filepath + ' start -->');
					arr.push(body.toString());
					tab && arr.push('<!--' + tmplMatch.filepath + ' end -->');
					this.data = this.data.replace( tmplMatch.tmpl, arr.join('\r\n') );
					
				}else{
					this.data = body.toString();
				}
				var m = onload( this.data );
				if( m ){
					this.tmplMatch = m;
					send.call(this, m.filepath , onload);
				}
			}.bind(this));
		}.bind(this));
	req.on('error', function(){
		htmlError404.call( this );
	});
	req.end();
}
function stringToPatten( str ){
	return new RegExp(str.replace(/\$/g,'\\$')
		.replace(/\!/g,'\\!')
		.replace(/\{/g,'\\{')
		.replace(/\}/g,'\\}')
		.replace(/\(/g,'\\(')
		.replace(/\)/g,'\\)')
		.replace(/\[/g,'\\[')
		.replace(/\]/g,'\\]'), 'g');
}
function i18n( data ){
	var matchs = data.match( I18N_PATTERN ),
		i18nKeys = []
		codes = [],
		p = null;
	for( p in matchs ){
		var code = matchs[p];
		if( codes.indexOf(code) === -1 ){
			codes.push( code );
			i18nKeys.push( { code:code, key: code.match(new RegExp('"(.*?)"'))[1]} );
		}
	}
	codes = null;
	var tempdata = data;
	for( p in i18nKeys ){
		tempdata = tempdata.replace( stringToPatten( i18nKeys[p].code ), i18nKeys[p].key );
	}
	return tempdata;
}
function html200(){
	
	output.call( this,{ 
			statusCode : 200,
			content : i18n(this.data)
		});
}
function htmlError404(){
	output.call( this,{ 
			statusCode : 404,
			content : '404 Not Found'
		});
}
function htmlError500(){
	output.call( this,{ 
			statusCode : 500,
			content : '500 Internal Server Error'
		});
}
function output( obj ){
	var res = this.config.response;
	//console.log( this.layer ,this.config.request.pathname );
	if( !obj ){
		if( this.config.debug){
			console.log( 'static' );
		}
		this.callback();
	}else{
		if( this.config.debug){
			console.dir( obj );
		}else{
			//console.log( 'ssi' );
			//this.config.response.clear();
			//console.dir(res.body());
			res.clear();
			res.write(obj.content);
		}
		this.callback();
	}
}
function marge(newObject, defObject) {
  for (var key in defObject) {
  	newObject[key] || (newObject[key] = defObject[key]);
  }
  return newObject;
}