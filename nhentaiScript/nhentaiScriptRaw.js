/* global unsafeWindow, GM_addStyle, GM_info, GM_xmlhttpRequest, appendDom, getTop, ComicReadWindow, ScriptMenu, gallery, N */
GM_addStyle(':root {--color1: #ed2553;--color2: #0d0d0d;--color3: #1f1f1f;--color4: #aea5a5;} #ScriptMenu{color: white !important;} @@NhentaiScript.css@@');
loadScriptMenu({
  '漫画阅读': {
    'Enable': true,
    '双页显示': true,
    '页面填充': true,
    '点击翻页': false,
    '阅读进度': true,
    '夜间模式': true
  },
  '体验优化': {
    'Enable': true,
    '自动翻页': true,
    '彻底屏蔽漫画': true,
    '在新页面中打开链接': true
  },
  'Version': GM_info.script.version
});


// 用于转换获得图片文件扩展名的 dict
const fileType = {
  'j': 'jpg',
  'p': 'png'
};

// 判断当前页是漫画详情页
if (typeof gallery !== 'undefined' && ScriptMenu.UserSetting['漫画阅读'].Enable) {
  appendDom(document.getElementById('download').parentNode, '<a href="javascript:;" id="comicReadMode" class="btn btn-secondary"><i class="fa fa-book"></i> Load comic</a>');
  let comicReadModeDom = document.getElementById('comicReadMode');
  comicReadModeDom.addEventListener('click', function () {
    if (!comicReadModeDom.innerHTML.includes('loading')) {
      if (ComicReadWindow !== undefined)
        ComicReadWindow.start();
      else {
        const imgTotalNum = gallery.num_pages;
        let loadImgNum = 0,
            imgList = [],
            blobList = [];
        comicReadModeDom.innerHTML = `<i class="fa fa-spinner"></i> loading —— 0/${imgTotalNum}`;
        for (let i = 0; i < imgTotalNum; i++) {
          GM_xmlhttpRequest({
            method: 'GET',
            url: `https://i.nhentai.net/galleries/${gallery.media_id}/${i + 1}.${fileType[gallery.images.pages[i].t]}`,
            responseType: 'blob',
            onload: function (xhr) {
              if (xhr.status === 200) {
                blobList[i] = [xhr.response];
                blobList[i].push(fileType[gallery.images.pages[i].t]);
                imgList[i] = document.createElement('img');
                imgList[i].src = URL.createObjectURL(xhr.response);
                if (++loadImgNum !== imgTotalNum)
                  comicReadModeDom.innerHTML = `<i class="fa fa-spinner"></i> loading —— ${loadImgNum}/${imgTotalNum}`;
                else {
                  loadComicReadWindow({
                    'comicImgList': imgList,
                    'readSetting': ScriptMenu.UserSetting['漫画阅读'],
                    'EndExit': () => scrollTo(0, getTop(document.getElementById('comment-container'))),
                    'comicName': gallery.title.hasOwnProperty('japanese') ? gallery.title['japanese'] : gallery.title['english'],
                    'blobList': blobList
                  });
                  comicReadModeDom.innerHTML = '<i class="fa fa-book"></i> Read';
                }
              }
            }
          });
        }
      }
    }
  });
}

// 判断当前页是漫画浏览页
else if (document.getElementsByClassName('index-container').length) {
  const blacklist = N.options.blacklisted_tags;

  if (ScriptMenu.UserSetting['体验优化']['自动翻页']) {
    let pageNum = document.querySelector('.page.current') ? +document.querySelector('.page.current').innerHTML : false,
        loadLock = !pageNum,
        apiUrl,
        contentDom = document.getElementById('content');

    let loadNewComic = function () {
      if (!loadLock && contentDom.lastElementChild.getBoundingClientRect().top <= window.innerHeight) {
        loadLock = true;
        GM_xmlhttpRequest({
          method: 'GET',
          url: `${apiUrl}page=${++pageNum}${window.location.pathname.includes('popular') ? '&sort=popular ' : ''}`,
          onload: function (xhr) {
            if (xhr.status === 200) {
              const Info = JSON.parse(xhr.responseText);
              let comicDomHtml = '';
              for (let i = 0; i < Info.result.length; i++) {
                const tempComicInfo = Info.result[i];
                // 在 用户未登录 或 黑名单为空 或 未开启屏蔽 或 漫画标签都不在黑名单中 时添加
                if (!(blacklist && blacklist.length && ScriptMenu.UserSetting['体验优化']['彻底屏蔽漫画'] && tempComicInfo.tags.every(e => blacklist.includes(e.id))))
                  comicDomHtml += `<div class="gallery" data-tags="${tempComicInfo.tags.map(e => e.id).join(' ')}"><a ${ScriptMenu.UserSetting['体验优化']['在新页面中打开链接'] ? 'target="_blank"' : ''} href="/g/${tempComicInfo.id}/" class="cover" style="padding:0 0 ${tempComicInfo.images.thumbnail.h / tempComicInfo.images.thumbnail.w * 100}% 0"><img is="lazyload-image" class="" width="${tempComicInfo.images.thumbnail.w}" height="${tempComicInfo.images.thumbnail.h}" src="https://t.nhentai.net/galleries/${tempComicInfo.media_id}/thumb.${fileType[tempComicInfo.images.thumbnail.t]}"><div class="caption">${tempComicInfo.title.english}</div></a></div>`;
              }

              // 构建页数按钮
              if (comicDomHtml) {
                let pageNumDom = [];
                for (let i = pageNum - 5; i <= pageNum + 5; i++)
                  if (i > 0 && i <= Info.num_pages)
                    pageNumDom.push(`<a ${ScriptMenu.UserSetting['体验优化']['在新页面中打开链接'] ? 'target="_blank" ' : ''}href="?page=${i}" class="page${i === pageNum ? ' current' : ''}">${i}</a>`);
                appendDom(contentDom, `<h1>${pageNum}</h1><div class="container index-container">${comicDomHtml}</div><section class="pagination">
                <a ${ScriptMenu.UserSetting['体验优化']['在新页面中打开链接'] ? 'target="_blank" ' : ''}href="?page=1" class="first"><i class="fa fa-chevron-left"></i><i class="fa fa-chevron-left"></i></a><a ${ScriptMenu.UserSetting['体验优化']['在新页面中打开链接'] ? 'target="_blank" ' : ''}href="?page=${pageNum - 1}" class="previous"><i class="fa fa-chevron-left"></i></a>
                ${pageNumDom.join('')}
                ${pageNum !== Info.num_pages ? `<a ${ScriptMenu.UserSetting['体验优化']['在新页面中打开链接'] ? 'target="_blank" ' : ''}href="?page=${pageNum + 1}" class="next"><i class="fa fa-chevron-right"></i></a><a ${ScriptMenu.UserSetting['体验优化']['在新页面中打开链接'] ? 'target="_blank" ' : ''}href="?page=${Info.num_pages}" class="last"><i class="fa fa-chevron-right"></i><i class="fa fa-chevron-right"></i></a>` : ''}</section>`);
              }

              // 添加分隔线
              appendDom(contentDom, '<hr>');
              if (pageNum < Info.num_pages)
                loadLock = false;
              else
                contentDom.lastElementChild.style.animationPlayState = 'paused';

              // 当前页的漫画全部被屏蔽或当前显示的漫画少到连滚动条都出不来时，继续加载
              if (!comicDomHtml || contentDom.offsetHeight < document.body.offsetHeight)
                loadNewComic();
            }
          }
        });
      }
    };

    if (ScriptMenu.UserSetting['体验优化']['彻底屏蔽漫画'] && blacklist && blacklist.length) {
      // 用匹配黑名单的 css 选择器选择被屏蔽漫画（这是 nhentai 自己用的方法
      let n = document.querySelectorAll(blacklist.map(blacklist => N.format('.gallery[data-tags~="{0}"]', blacklist)).join(',')),
          i = n.length;
      while (i--)
        n[i].parentNode.removeChild(n[i]);
    }

    if (window.location.pathname === '/') {
      apiUrl = 'https://nhentai.net/api/galleries/all?';
      unsafeWindow.onscroll = loadNewComic;
      appendDom(contentDom, '<hr>');
      loadNewComic();
    } else if (!loadLock) {
      GM_xmlhttpRequest({
        method: 'GET',
        url: document.querySelector('.index-container > div > a').href,
        onload: function (xhr) {
          if (xhr.status === 200) {
            apiUrl = `https://nhentai.net/api/galleries/tagged?tag_id=${new RegExp(`tag-(\\d+?(?= ">${document.querySelector('#content span:nth-child(2)').innerHTML}))`).exec(xhr.responseText)[1]}&`;
            unsafeWindow.onscroll = loadNewComic;
            appendDom(contentDom, '<hr>');
            loadNewComic();
          }
        }
      });
    }
  }
}

if (ScriptMenu.UserSetting['体验优化']['在新页面中打开链接'])
  [...document.querySelectorAll('a:not([href^="javascript:"])')].forEach(e => e.setAttribute('target', '_blank'));
