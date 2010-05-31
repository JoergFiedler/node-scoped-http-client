var path = require('path')
  , http = require('http')
  , sys  = require('sys')
  , url  = require('url')
  , qs   = require('querystring')

var ScopedClient = function(url, options) {
  this.options = this.buildOptions(url, options)
}

ScopedClient.methods = ["GET", "POST", "PUT", "DELETE", "HEAD"]
ScopedClient.methods.forEach(function(method) {
  ScopedClient.prototype[method.toLowerCase()] = function(body, callback) {
    return this.request(method, body, callback)
  }
})
ScopedClient.prototype.del = ScopedClient.prototype['delete']

ScopedClient.prototype.request = function(method, reqBody, callback) {
  var   port = this.options.port || ScopedClient.defaultPort[this.options.protocol] || 80
    , client = http.createClient(port, this.options.hostname)
    ,    req = client.request(method, this.fullPath(), this.options.headers)

  if(typeof(reqBody) == 'function') {
    callback = reqBody
    reqBody  = null
  }

  if(reqBody && reqBody.length > 0) req.write(reqBody, 'utf-8')

  if(callback) callback(req)

  return function(callback) {
    if(callback) {
      req.addListener('response', function(resp) {
        resp.setEncoding('utf8')
        var body = ''
        resp.addListener('data', function(chunk) {
          body += chunk
        })

        resp.addListener('end', function() {
          callback(resp, body)
        })
      })
    }
    req.end()
  }
}

ScopedClient.prototype.fullPath = function() {
  var search = qs.stringify(this.options.query)
    ,   path = this.options.pathname || '/'
  if(search.length > 0) path += '?' + search
  return path
}

ScopedClient.defaultPort = {'http:':80, 'https:':443, http:80, https:443}

ScopedClient.prototype.scope = function(url, options, callback) {
  var override = this.buildOptions(url, options)
    , scoped   = new ScopedClient(this.options)
                   .protocol(override.protocol)
                   .host(override.hostname)
                   .path(override.pathname)

  if(typeof(url) == 'function')          callback = url
  else if(typeof(options) == 'function') callback = options
  if(callback) callback(scoped)
  return scoped
}

ScopedClient.prototype.path = function(p) {
  if(p && p.length > 0)
    this.options.pathname = p.match(/^\//) ? p : path.join(this.options.pathname, p)
  return this
}

ScopedClient.prototype.query = function(key, value) {
  if(!this.options.query) this.options.query = {}
  if(typeof(key) == 'string') {
    if(value)
      this.options.query[key] = value
    else
      delete this.options.query[key]
  } else
    extend(this.options.query, key)
  return this
}

ScopedClient.prototype.host = function(h) {
  if(h && h.length > 0)
    this.options.hostname = h
  return this
}

ScopedClient.prototype.port = function(p) {
  if(p && (typeof(p) == 'number' || p.length > 0))
    this.options.port = p
  return this
}

ScopedClient.prototype.protocol = function(p) {
  if(p && p.length > 0)
    this.options.protocol = p
  return this
}

ScopedClient.prototype.auth = function(user, pass) {
  if(!user)
    this.options.auth = null
  else if(!pass && user.match(/:/))
    this.options.auth = user
  else
    this.options.auth = user + ':' + pass
  return this
}

ScopedClient.prototype.hash = function(h) {
  this.options.hash = h
  return this
}

ScopedClient.prototype.buildOptions = function() {
  var options = {}
    , i       = 0

  while(arguments[i]) {
    var ty = typeof(arguments[i])
    if(ty == 'string') {
      options.url = arguments[i]
    } else if(ty != 'function') {
      extend(options, arguments[i])
    }
    i += 1
  }
  if(options.url) {
    extend(options, url.parse(options.url, true))
    delete options.url
    delete options.href
    delete options.search
  }
  if(!options.headers)  options.headers  = {}
  return options
}

function extend(a, b) {
  var prop;
  Object.keys(b).forEach(function(prop) {
    a[prop] = b[prop];
  })
  return a;
}

exports.create = function(url, options) {
  return new ScopedClient(url, options)
}