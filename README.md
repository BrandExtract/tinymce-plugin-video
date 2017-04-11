# Video plugin for TinyMCE 4

Embed a video into the content.

## Installation

* `npm install @brandextract/tinymce-plugin-video` or `bower install tinymce-plugin-video`
* Move to a folder named "vide" under tinymce/plugins through build scripts.

## Configuration

```javascript
<script type="text/javascript">
tinymce.init({
    selector: "textarea",
    plugins: "video",
    toolbar: "video",
    extended_valid_elements: "+iframe[src|width|height|name|align|class]"
});
</script>
```

## Development

### The short version

```bash
git clone https://github.com/BrandExtract/tinymce-plugin-video.git
cd tinymce-plugin-video
npm install
```

Edit the file, add and commit.

### Longer version, or why not edit the file directly on GitHub

There is a `pre-commit` hook that is automatically installed after
`npm install` and generates the minified file and sourcemap. Therefore,
it is recommended that we checkout the repo and run `npm install` to
work on it, instead of editing the file directly through GitHub web.

Otherwise, we will need to generate the minified file and sourcemap.