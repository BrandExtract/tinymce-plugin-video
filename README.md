# Video plugin for TinyMCE 4

Embed a video into the content.

## Installation

* `bower|npm` `install https://github.com/BrandExtract/tinymce-plugin-video.git --save`
* Move to `tinymce/plugins` folder through build scripts.

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