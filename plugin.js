(function videoPlugin(tinymce) {
  "use strict";

  const PROVIDERS = ["youtube", "vimeo"];
  PROVIDERS["youtube"] = {
    // https://youtu.be/$id
    // https://www.youtube.com/watch?v=$id
    // https://www.youtube.com/embed/$id
    pattern: /youtu(?:\.be|be\.com)\/(?:watch\?v=|embed\/)?([a-z0-9\-_]+)(?:\?|&)?(.+)?/i,
    api: "//www.youtube.com/embed/",
    options: [
      { name: "rel", type: "checkbox", text: "Show suggested videos when the video finishes" },
      { name: "controls", type: "checkbox", text: "Show player controls" },
      { name: "showinfo", type: "checkbox", text: "Show video title and player actions" }
    ]
  };
  PROVIDERS["vimeo"] = {
    // https://vimeo.com/$id
    // https://vimeo.com/*/*/video/$id
    // https://vimeo.com/album/*/video/$id
    // https://vimeo.com/channels/*/*
    // https://vimeo.com/groups/*/videos/$id
    // https://vimeo.com/ondemand/*/*
    // https://player.vimeo.com/video/$id
    pattern: /(?:player.)?vimeo.com\/(?:video\/)?([0-9]+)(?:\?|&)?(.+)?/,
    api: "//player.vimeo.com/video/",
    options: [
      { name: "portrait", type: "checkbox", "text": "Show portrait in overlay" },
      { name: "title", type: "checkbox", "text": "Show title in overlay" },
      { name: "byline", type: "checkbox", "text": "Show byline in overlay" }
    ]
  };

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
  function parseUrl(url) {
    const data = {};

    PROVIDERS.forEach(function buildData(name) {
      const provider = PROVIDERS[name];
      const matches = url.match(provider.pattern);
      if (matches) {
        data.name = name;
        const id = matches[1];
        const providerUrl = provider.api + id;
        data.url = providerUrl;
        return data;
      }
    });

    //if data is an empty object, then it is not a known provider
    if (Object.keys(data).length === 0) {
      return false;
    } else {
      return data;
    }
  }

  function Plugin(editor, url) {
    this.showDialog = this.showDialog.bind(this);
    this.render = this.render.bind(this);
    const plugin = this;
    plugin.editor = editor;
    plugin.currentProvider = null;
    this.configs = {};

    const baseConfig = {
      title: "Insert a video",
      initialData: {},
      body: {
        type: "panel",
        items: []
      },
      buttons: [
        {
          type: "cancel",
          name: "cancel",
          text: "Cancel"
        },
        {
          type: "submit",
          name: "save",
          text: "Save",
          primary: true
        }
      ],
      onChange: function onChange(api) {
        plugin.providerChange(api);
        plugin.render();
      },
      onSubmit: function onSubmit(api) {
        plugin.onsubmit();
        api.close();
      }
    };

    const sharedFields = [
      {
        type: "input",
        label: "Source",
        name: "url",
      },
      {
        type: "grid",
        columns: 3,
        items: [
          {
            type: "input",
            label: "Width",
            name: "width",
          },
          {
            type: "input",
            label: "Height",
            name: "height",
          },
          {
            type: "checkbox",
            label: "Fullscreen",
            name: "fullscreen",
          }
        ]
      },
    ];

    const unkownFields = [ ...sharedFields, ...[
        {
          type: "htmlpanel",
          html: "<div id='preview'></div>",
        }
      ]
    ];

    const youtubeFields = [ ...sharedFields, ...[
        {
          type: "checkbox",
          label: "Show suggested videos when the video finishes",
          name: "rel",
        },
        {
          type: "checkbox",
          label: "Show player controls",
          name: "controls",
        },
        {
          type: "checkbox",
          label: "Show video title and player actions",
          name: "showinfo",
        },
        {
          type: "htmlpanel",
          html: "<div id='preview'></div>",
        }
      ]
    ];

    const vimeoFields = [ ...sharedFields, ...[
        {
          type: "checkbox",
          label: "Show portrait in overlay",
          name: "portrait",
        },
        {
          type: "checkbox",
          label: "Show title in overlay",
          name: "title",
        },
        {
          type: "checkbox",
          label: "Show byline in overlay",
          name: "byline",
        },
        {
          type: "htmlpanel",
          html: "<div id='preview'></div>",
        }
      ]
    ];

    this.configs["unknown"] = { ...baseConfig, ...{
        body: {
          type: "panel",
          items: unkownFields
        }
      }
    };

    this.configs["youtube"] = { ...baseConfig, ...{
        body: {
          type: "panel",
          items: youtubeFields
        }
      }
    };

    this.configs["vimeo"] = { ...baseConfig, ...{
        body: {
          type: "panel",
          items: vimeoFields
        }
      }
    };

    const mapSVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 48 48" xml:space="preserve"><g><g><g>
      <path d="M44,4.982H4c-2.2,0-4,1.8-4,4v30.036c0,2.2,1.8,4,4,4h40c2.2,0,4-1.8,4-4V8.982C48,6.782,46.2,4.982,44,4.982z M20.204,12.789l9.593,6.55l-9.593,6.55V12.789z M40.001,35.212H18.875c-0.57,1.239-1.816,2.104-3.27,2.104 s-2.699-0.866-3.27-2.104H8c-0.829,0-1.5-0.673-1.5-1.5c0-0.828,0.671-1.5,1.5-1.5h4.336c0.57-1.24,1.815-2.106,3.27-2.106 s2.7,0.866,3.27,2.106h21.126c0.828,0,1.5,0.672,1.5,1.5C41.502,34.54,40.829,35.212,40.001,35.212z" fill="#333333"/>
      <circle cx="15.605" cy="33.712" r="1.397" fill="#333333"/>
    </g></g></g></svg>`;

    editor.ui.registry.addIcon("video", mapSVG);

    // Add a button that opens a window
    editor.ui.registry.addButton("video", {
      icon: "video",
      tooltip: "Insert/edit video",
      onAction: (_) => plugin.showDialog()
    });

    editor.ui.registry.addMenuItem("video", {
      icon: "video",
      text: "Video",
      onAction: (_) => plugin.showDialog(),
      context: "insert"
    });
  }

  /**
   * Parses selected video and display dialog for it
   *
   * If there is a selected video, it will parse information out of it,
   * such as the source URL, the dimensions, etc...
   *
   * It then uses the information to display the dialog.
  */
  Plugin.prototype.showDialog = function showDialog() {
    const editor = this.editor;
    const dom = editor.dom;
    const params = {};
    const plugin = this;

    // Parse the current map source for values to insert into
    // the dialog inputs.
    let videoElement = editor.selection.getNode();

    if (videoElement) {
      let url = dom.getAttrib(videoElement, "src");

      if (!url) {
        // This is the element used by TinyMCE to wrap the iframe.
        videoElement = videoElement.children[0];
        url = dom.getAttrib(videoElement, "src");
      }

      params.url = url;

      const allowFullscreen = dom.getAttrib(videoElement, "allowfullscreen");
      if (allowFullscreen) {
        params.fullscreen = true;
      }

      params.width = dom.getAttrib(videoElement, "width");
      params.height = dom.getAttrib(videoElement, "height");
    }

    if (!params.width) {
      params.width = "400";
    }
    if (!params.height) {
      params.height = "300";
    }

    // Reset this so `.render` runs correctly.
    this.window = null;

    const provider = parseUrl(params.url);
    if (provider.name === "youtube" || provider.name === "vimeo") {
      const queryString = params.url.split("?")[1];
      const queryParams = new URLSearchParams(queryString);
      const options = PROVIDERS[provider.name].options || [];
      params.url = provider.url;
      options.forEach(function buildParams(option) {
        const name = option.name;
        const value = queryParams.get(name);

        if (value === "0" || value === false) {
          params[name] = false;
        } else {
          params[name] = true;
        }
      });
      let config = this.configs[provider.name];
      config.initialData = params;
      this.currentProvider = provider.name;
      this.window = this.editor.windowManager.open(config);
    } else {
      let config = this.configs["unknown"];
      config.initialData = params;
      this.currentProvider = null;
      this.window = this.editor.windowManager.open(config);
    }

    plugin.render();
  }

  /**
   * Handles change in provider. Loads the correct dialog when video provider is changed.
   */

  Plugin.prototype.providerChange = function providerChange(api) {
    const data = api.getData();
    const provider = parseUrl(data.url);
    if (provider.name === this.currentProvider || (this.currentProvider === null && provider === false)) {
      return;
    }

    if (provider.name === "youtube") {
      data.rel = true;
      data.controls = true;
      data.showinfo = true;
      let config = this.configs[provider.name];
      config.initialData = data;
      api.redial(config);
      this.currentProvider = provider.name;
    } else if (provider.name === "vimeo") {
      data.portrait = true;
      data.title = true;
      data.byline = true;
      let config = this.configs[provider.name];
      config.initialData = data;
      api.redial(config);
      this.currentProvider = provider.name;
    } else {
      let config = this.configs["unknown"];
      config.initialData = data;
      api.redial(config);
      this.currentProvider = null;
    }
  };

  /**
   * Renders video option inputs and preview panel.
   *
   * Different video provider has different option set, so
   * we need to load different inputs depending on the URL.
   *
   * It then also renders the preview panel for the video.
   */
  Plugin.prototype.render = function render() {
    const data = this.window.getData();
    let html = this.html(true);

    const url = data.url;
    if (!url) {
      return "";
    }

    html = this.html(true);

    const preview = $AM.find("#preview")[0];
    preview.innerHTML = html;

    return html;
  }

  /**
   * Generates the HTML for the iframe.
   */
  Plugin.prototype.html = function html(useInlineStyle) {
    const data = this.window.getData();
    let embedUrl = data.url;
    const provider = parseUrl(data.url);

    const queries = [];
    if (provider) {
      const options = PROVIDERS[provider.name].options || [];
      options.forEach(function buildQueries(option) {
        const name = option.name;
        const value = data[name];

        if (value === "0" || value === false) {
          queries.push(name + "=" + 0);
        }
      });
      embedUrl = provider.url;
    }

    if (queries.length) {
      embedUrl += "?" + queries.join("&");
    }

    const width = data.width;
    const height = data.height;

    let html = "<iframe" +
      " src='" + embedUrl + "'" +
      " width='" + width + "' height='" + height + "'";
    if (data.fullscreen) {
      html += " allowfullscreen";
    }
    if (useInlineStyle) {
      html += " style='width: " + width + "px; height: " + height + "px;'";
    }
    html += " ></iframe>";

    return html;
  };

  Plugin.prototype.onsubmit = function onSubmit() {
    // Insert content when the window form is submitted
    this.editor.insertContent(this.html());
  };

  // Register plugin
  tinymce.PluginManager.add("video", (editor, url) => {
    let plugin = new Plugin(editor, url);
    return {
      getMetadata: () => ({
        name: "Video - Add embeded video easily.",
        url: "http://www.brandextract.com",
      })
    };
  });
})(window.tinymce);
