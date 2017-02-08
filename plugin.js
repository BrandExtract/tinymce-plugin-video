(function (tinymce) {
  'use strict'

  var PROVIDERS = ['youtube', 'vimeo']
  PROVIDERS['youtube'] = {
    // https://youtu.be/$id
    // https://www.youtube.com/watch?v=$id
    // https://www.youtube.com/embed/$id
    pattern: /youtu(?:\.be|be\.com)\/(?:watch\?v=|embed\/)?([a-z0-9\-_]+)(?:\?|&)?(.+)?/i,
    api: '//www.youtube.com/embed/',
    options: [
      {name: 'rel', type: 'checkbox', text: 'Show suggested videos when the video finishes'},
      {name: 'controls', type: 'checkbox', text: 'Show player controls'},
      {name: 'showinfo', type: 'checkbox', text: 'Show video title and player actions'}
    ]
  }
  PROVIDERS['vimeo'] = {
    // https://vimeo.com/$id
    // https://vimeo.com/*/*/video/$id
    // https://vimeo.com/album/*/video/$id
    // https://vimeo.com/channels/*/*
    // https://vimeo.com/groups/*/videos/$id
    // https://vimeo.com/ondemand/*/*
    // https://player.vimeo.com/video/$id
    pattern: /(?:player.)?vimeo.com\/(?:video\/)?([0-9]+)(?:\?|&)?(.+)?/,
    api: '//player.vimeo.com/video/',
    options: [
      {name: 'portrait', type: 'checkbox', 'text': 'Show portrait in overlay'},
      {name: 'title', type: 'checkbox', 'text': 'Show title in overlay'},
      {name: 'byline', type: 'checkbox', 'text': 'Show byline in overlay'}
    ]
  }

  /**
   * @typedef {Object} Video
   * @property {string|number} id Video ID
   * @property {string} provider The video provider, i.e., youtube, vimeo, etc...
   * @property {string} url The embed URL
   * @property {...any} option The rest of options.
   */

  /**
   * Parses video URL into data object
   *
   * @param {string} url The video URL
   * @returns {Video} The video data
   */
  function parseUrl (url) {
    var data = {}
    data.url = url

    PROVIDERS.forEach(function (name) {
      var provider = PROVIDERS[name]
      var matches = url.match(provider.pattern)
      if (matches) {
        data.provider = name
        data.id = matches[1]
        data.url = provider.api + data.id
        var queries = matches[2] || ''
        queries.split('&').forEach(function (querystring) {
          var kv = querystring.split('=')
          data[kv[0]] = kv[1]
        })
      }
    })

    return data
  }

  function Plugin (editor, url) {
    this.showDialog = this.showDialog.bind(this)
    this.render = this.render.bind(this)

    var plugin = this
    plugin.editor = editor

    // Set the selector for selected element that the button can use
    // to determine its state.
    var stateSelector = PROVIDERS.map(function (name) {
      var provider = PROVIDERS[name]
      var selector = 'iframe[src*="' + provider.api + '"]'
      // After inserting an iframe, TinyMCE wraps it with a span to handle clicks.
      // So we need to add a selector for it too.
      selector += ',' + '[data-mce-p-src*="' + provider.api + '"]'
      return selector
    }).join(',')

    // Add a button that opens a window
    editor.addButton('video', {
      image: url + '/img/icons/video.svg',
      tooltip: 'Insert/edit video',
      stateSelector: stateSelector,
      onclick: plugin.showDialog
    })

    editor.addMenuItem('video', {
      image: url + '/img/icons/video.svg',
      text: 'Video',
      onclick: plugin.showDialog,
      context: 'insert'
    })
  }

  /**
   * Parses selected video and display dialog for it
   *
   * If there is a selected video, it will parse information out of it,
   * such as the source URL, the dimensions, etc...
   *
   * It then uses the information to display the dialog.
  */
  Plugin.prototype.showDialog = function () {
    var editor = this.editor
    var dom = editor.dom
    var params = this.data = {}

    // Parse the current map source for values to insert into
    // the dialog inputs.
    var videoElement = editor.selection.getNode()

    if (videoElement) {
      var url = dom.getAttrib(videoElement, 'src')

      if (!url) {
        // This is the element used by TinyMCE to wrap the iframe.
        videoElement = videoElement.children[0]
        url = dom.getAttrib(videoElement, 'src')
      }
      params = this.data = tinymce.extend({}, params, parseUrl(url))

      var allowFullscreen = dom.getAttrib(videoElement, 'allowfullscreen')
      if (allowFullscreen) {
        params.fullscreen = 1
      }

      params.width = dom.getAttrib(videoElement, 'width')
      params.height = dom.getAttrib(videoElement, 'height')
    }

    if (!params.width) params.width = 400
    if (!params.height) params.height = 300

    // Reset this so `.render` runs correctly.
    this.window = null

    this.window = this.editor.windowManager.open({
      title: 'Insert a video',
      data: params,
      body: [
        {
          type: 'textbox',
          subtype: 'url',
          label: 'Source',
          ariaLabel: 'Source',
          name: 'url',
          maxLength: 256,
          size: 50,
          onchange: this.render
        },
        {
          type: 'container',
          label: 'Dimensions',
          layout: 'flex',
          direction: 'row',
          align: 'center',
          spacing: 5,
          items: [
            {name: 'width', type: 'textbox', maxLength: 5, size: 3, onchange: this.render, ariaLabel: 'Width'},
            {type: 'label', text: 'x'},
            {name: 'height', type: 'textbox', maxLength: 5, size: 3, onchange: this.render, ariaLabel: 'Height'},
            {name: 'fullscreen', type: 'checkbox', text: 'Allow fullscreen', onchange: this.render}
          ]
        },
        {
          type: 'container',
          label: 'Options',
          name: 'options'
        },
        {
          type: 'container',
          name: 'preview'
        }
      ],
      onsubmit: this.onsubmit.bind(this)
    })

    this.render()
  }

  /**
   * Renders video option inputs and preview panel.
   *
   * Different video provider has different option set, so
   * we need to load different inputs depending on the URL.
   *
   * It then also renders the preview panel for the video.
   */
  Plugin.prototype.render = function () {
    var data = this.data || {}
    var html = this.html(true)
    var win = this.window
    var plugin = this

    if (win) {
      win.find('*').each(function (ctrl) {
        var name = ctrl.name()
        if (!name) return
        data[name] = ctrl.value()
      })
      var url = data.url
      if (!url) return ''

      data = this.data = tinymce.extend({}, data, parseUrl(url))

      var optionContainer = win.find('#options')[0]
      optionContainer.items().remove()
      var options = PROVIDERS[data.provider].options.map(function (option) {
        // Each provider defines a list of options.
        option = tinymce.extend({}, option, {onchange: plugin.render})
        var value = data[option.name]

        if (!(value === '0' || value === false)) {
          // When parsing from URL, value can be '0', so we don't check this.
          // Also, this `render` also called after checkbox being toggled,
          // so we only check when it's explicitly `true`.
          option.checked = true
        }
        return option
      })
      var containerElm = optionContainer.getEl('body')
      // Container has an inner child node that wraps the controls,
      // so we need to reset the dimension of it so the container can
      // updateLayoutRect.
      containerElm.style.width = ''
      containerElm.style.height = ''
      optionContainer.append(options)
      optionContainer.updateLayoutRect()
      optionContainer.parentsAndSelf().each(function (ctrl) {
        ctrl.reflow()
      })

      html = this.html(true)

      var preview = win.find('#preview')[0]
      preview.innerHtml(html).updateLayoutRect()
      preview.parentsAndSelf().each(function (ctrl) {
        ctrl.reflow()
      })
    }

    return html
  }

  /**
   * Generates the HTML for the iframe.
   */
  Plugin.prototype.html = function (useInlineStyle) {
    var data = this.data || {}
    if (!data.id) return ''
    var embedUrl = data.url

    var options = PROVIDERS[data.provider].options || []
    var queries = []
    options.forEach(function (option) {
      var name = option.name
      var value = data[name]

      if (value === '0' || value === false) {
        queries.push(name + '=' + 0)
      }
    })

    if (queries.length) {
      embedUrl += '?' + queries.join('&')
    }

    var width = data.width
    var height = data.height

    var html = '<iframe' +
      ' src="' + embedUrl + '"' +
      ' width="' + width + '" height="' + height + '"'
    if (data.fullscreen) {
      html += ' allowfullscreen'
    }
    if (useInlineStyle) {
      html += ' style="width: ' + width + 'px; height: ' + height + 'px;"'
    }
    html += ' />'

    return html
  }

  Plugin.prototype.onsubmit = function () {
    // Insert content when the window form is submitted
    this.editor.insertContent(this.html())
  }

  tinymce.create('tinymce.plugins.Video', {
    init: function (editor, url) {
      return new Plugin(editor, url)
    },
    getInfo: function () {
      return {
        longname: 'Video - Add embeded video easily.',
        author: 'BrandExtract',
        authorurl: 'http://www.brandextract.com',
        version: '0.1.0'
      }
    }
  })

  // Register plugin
  tinymce.PluginManager.add('video', tinymce.plugins.Video)
})(window.tinymce)
