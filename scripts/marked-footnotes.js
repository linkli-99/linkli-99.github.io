const markedFootnoteModule = require('marked-footnote')

const markedFootnote =
  markedFootnoteModule.default || markedFootnoteModule.markedFootnote || markedFootnoteModule

hexo.extend.filter.register('marked:use', function (markedUse) {
  markedUse(markedFootnote({
    refMarkers: true,
    footnoteDivider: true
  }))
})

hexo.extend.filter.register('after_post_render', function (data) {
  data.content = data.content.replace(
    /<h2 id="footnote-label" class="sr-only">([^<]*)<\/h2>/,
    '<span id="footnote-label" class="sr-only">$1</span>'
  )
  return data
})
