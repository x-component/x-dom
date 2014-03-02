'use strict';

/**
 * x-dom
 * =====
 *
 * Read a HTML from file or as string and parse it
 * to an DOM tree as a "document" property of a "window" object
 *
 * file(filenme, [options,] function(err,window){...})
 * --------------------------------
 *
 * parse(str, [options,] function(err,window){...})
 * --------------------
 *
 */

var
	fs         = require('fs'),
	path       = require('path'),
	domino     = require('domino'),
	jsdom      = null,
	phantom    = null,
	log        = require('x-log');

var M;
module.exports = M = {
	
	file:function (file, options, cb/*!err,window*/) {
		
		if(typeof(options) === 'function' ){
			cb      = options;
			options = {};
		}
		
		var self = this;
		try {
			fs.readFile(path.resolve(file), function (err, data) {
				if (err){ cb(err); return; }
				self.parse(data.toString('utf8'),options,cb);
			});
		} catch (e) {
			if(log.error)log.error('file read error', {file:file,err:e} );
			cb(e);
		}
	},
	parse: function(str, options, cb/*!err,window*/) {
		
		if(typeof(options) === 'function' ){
			cb      = options;
			options = {};
		}
		
		(function(parsed){
			try {
				if(options.jsdom){
					var jsdom = M.jsdom();
					jsdom.env({ html:str, features:{QuerySelector:true}, done:function(err,win){
						if(err){
							parsed(err);
							return;
						}
						win.document.onload = function() {
							parsed(err,win);
						};
					}});
				} else if(options.phantom){
					var phantom = M.phantom();
				} else {
					parsed( null, domino.createWindow(str) );
				}
			} catch (e) {
				parsed(e);
			}
		})(function(err,window){
			if (err || !window){
				if(log.error)log.error('parsing html data failed', err);
				cb(err || new Error('no window'));
				return;
			}
			
			cb(null,window);
		});
	},
	jsdom:function(){
		if(!jsdom){
			jsdom = require('jsdom');
			
			// patches to correct document write see: https://github.com/tmpvar/jsdom/pull/489
			jsdom.defaultLevel.HTMLDocument.prototype.write = function(text) {
				if (this._writeAfterElement) {
					// If called from an script element directly (during the first tick),
					// the new elements are inserted right after that element.
					var tempDiv       = this.createElement('div');
					tempDiv.innerHTML = text;
					
					var child    = tempDiv.firstChild;
					var previous = this._writeAfterElement;
					var parent   = this._writeAfterElement.parentNode;
					
					while (child) {
						var node = child;
						child    = child.nextSibling;
						parent.insertBefore(node, previous.nextSibling);
						previous = node;
					}
				} else {
					this.innerHTML = text;
				}
			};
			jsdom.defaultLevel.HTMLScriptElement.prototype._eval = function(text, filename) {
				if (this._ownerDocument.implementation.hasFeature('ProcessExternalResources', 'script')
					&& this.language && jsdom.defaultLevel.languageProcessors[this.language]){
					this._ownerDocument._writeAfterElement = this;
					jsdom.defaultLevel.languageProcessors[this.language](this, text, filename);
					delete this._ownerDocument._writeAfterElement;
				}
			};
		}
		return jsdom;
	},
	phantom:function(){
		if(!phantom){
			phantom = require('node-phantom');
		}
		return phantom;
		/*!
			phantom.create(function(err,ph) {
			return ph.createPage(function(err,page) {
				return page.open("http://tilomitra.com/repository/screenscrape/ajax.html", function(err,status) {
				console.log("opened site? ", status);
				page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js', function(err) {
					//jQuery Loaded.
					//Wait for a bit for AJAX content to load on the page. Here, we are waiting 5 seconds.
					setTimeout(function() {
						return page.evaluate(function() {
							//Get what you want from the page using jQuery. A good way is to populate an object with all the jQuery commands that you need and then return the object.
							var h2Arr = [],
							pArr = [];
							$('h2').each(function() {
								h2Arr.push($(this).html());
							});
							$('p').each(function() {
								pArr.push($(this).html());
							});
							return {
								h2: h2Arr,
								p: pArr
							};
						}, function(err,result) {
							console.log(result);
							ph.exit();
						});
					}, 5000);
				});
				});
			});
		});
		*/
	}
};
