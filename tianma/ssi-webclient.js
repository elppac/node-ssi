var fs = require('fs'),
	path = require('path'),
	http = require('http'),
	https = require('https'),
	url = require('url');

var INCLUDE_PATTERN = new RegExp('<!--#include file=[\"|\'](.*?\.html)[\"|\'] -->'),
	IP_PATTERN = /^(?:\d+\.){3}\d+$/,
	FILE_EXT = [ 'html' , 'htm' ];

module.exports = ssiWebClient;

function ssiWebClient( config ){
	var config = this.config = marge.call( this, config, {
		request : null,
		response : null,
		tab : false,
		limit : 500,
		debug : true
	});
	this.layer = 0;
	//this.callback = callback;
	this.data = config.response.body();
	//页面没有找到
	if( config.response.status() !== 200 ){
		output.call(this,null);
	}
	
	//请求文件扩展名
	var ext = config.request.pathname.replace(/.*[\.\/]/, '').toLowerCase();
	//扩展名不适合
	if( FILE_EXT.indexOf( ext ) === -1 ){
		output.call(this,null);
	}
	
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

function main(){
	var m = contentMatch.call( this, this.data );
	console.log('main');
	console.dir( m );
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
				console.log('------------ send data ---------------');
				//console.log(chunk);
				body.push(chunk);
			});

			response.on('end', function () {
				console.log('------------ send end ---------------');
				
				body = Buffer.concat(body);
				console.log( body.toString() );
				tmplMatch = this.tmplMatch;
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
			});
		});
	req.on('error', function(){
		console.log('------------ send error ---------------');
		if( this.tmplMatch ){
			var arr = [];
			tab && arr.push('<!--' + tmplMatch.filepath + ' start -->');
			arr.push(body.toString());
			tab && arr.push('<!--' + tmplMatch.filepath + ' end -->');
			this.data = this.data.replace( tmplMatch.tmpl, arr.join('\r\n') );
		}
		this.data = this.data || '';
		if( this.layer === 1 && this.data === '' ){
			htmlError404.call( this );
		}else{
			onload( this.data );
		}
	});
	req.end();
}
function html200(){
	output.call( this,{ 
			statusCode : 200,
			content : this.data
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
	if( !obj ){
		//res.clear()
		res.write( '' );
	}else{
		if( this.config.debug){
			console.dir( obj );
		}else{
			res.status(obj.status);
			res.clear();
			res.write(obj.content);
		}
	}
}
function marge(newObject, defObject) {
  for (var key in defObject) {
  	newObject[key] || (newObject[key] = defObject[key]);
  }
  return newObject;
}