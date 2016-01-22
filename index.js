var htmlparser = require("htmlparser2")
var converters = require('./converters/')

var escapeMap = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\"",
  "&#x27;": "'",
  "&#x60;": "`",
  "&nbsp;": " ",
  "&#8202;": " "
}

var unescape = (function () {
  var source = `(?:${Object.keys(escapeMap).join('|')})`
  var testRegexp = RegExp(source)
  var replaceRegexp = RegExp(source, 'g')
  var escaper = function (match) {
    return escapeMap[match]
  }
  return function (string) {
    string = string || ''
    return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string
  }
})()

module.exports = function (html, options) {
  options = Object.assign({
    converter: 'CommonMark'
  }, options)

  var converter = converters[options.converter]

  var nodeBuffer = []
  var results = []
  var isInPreNode = false
  function convert(node) {
    node.md = (node.md && node.md.join('')) || ''
    return (converter[node.name] || converter['default'])(node) || ''
  }

  var parser = new htmlparser.Parser({
    onopentag: function (name, attributes) {
      var node = {
        name: name,
        attrs: attributes,
        isInPreNode: isInPreNode
      }
      if (name === 'pre') {
        isInPreNode = true
      }
      nodeBuffer.push(node)
    },
    ontext: function (text) {
      if (/^\s+$/.test(text)) {
        return
      }
      text = text.trim()
      text = unescape(text)
      console.log(text)
      var last = nodeBuffer[nodeBuffer.length - 1]
      if (last) {
        last.md = last.md || []
        last.md.push(text)
      } else {
        results.push(text)
      }
    },
    onclosetag: function (name) {
      var last = nodeBuffer.pop()
      var md = convert(last)
      if (nodeBuffer.length === 0) {
        return results.push(md)
      }

      if (name === 'pre') {
        isInPreNode = false
      }

      var tail = nodeBuffer[nodeBuffer.length - 1]
      tail.md = tail.md || []
      tail.md.push(md)
    }
  }, {decodeEntities: false})
  parser.write(html)
  parser.end()
  return results.join('')
}
