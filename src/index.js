/**
 * @typedef {object} LinkToolData
 * @description Link Tool's input and output data format
 * @property {string} link — data url
 * @property {metaData} meta — fetched link data
 */

/**
 * @typedef {object} metaData
 * @description Fetched link meta data
 * @property {string} image - link's meta image
 * @property {string} title - link's meta title
 * @property {string} description - link's description
 */

// eslint-disable-next-line
import css from './index.css';
import ToolboxIcon from './svg/toolbox.svg';
import ajax from '@codexteam/ajax';
// eslint-disable-next-line
import polyfill from 'url-polyfill';
import debounce from 'lodash.debounce';
import untils from './untils';

/**
 * @typedef {object} UploadResponseFormat
 * @description This format expected from backend on link data fetching
 * @property {number} success  - 1 for successful uploading, 0 for failure
 * @property {metaData} meta - Object with link data.
 *
 * Tool may have any data provided by backend, currently are supported by design:
 * title, description, image, url
 */
export default class LinkTool {
  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   *
   * @returns {{icon: string, title: string}}
   */
  static get toolbox() {
    return {
      icon: ToolboxIcon,
      title: 'Smart Link',
    };
  }

  /**
   * Allow to press Enter inside the LinkTool input
   *
   * @returns {boolean}
   * @public
   */
  static get enableLineBreaks() {
    return true;
  }

  /**
   * @param {LinkToolData} data - previously saved data
   * @param {config} config - user config for Tool
   * @param {object} api - Editor.js API
   */
  constructor({
    data,
    config,
    api,
  }) {
    this.api = api;

    /**
     * Tool's initial config
     */
    this.config = {
      endpoint: config.endpoint || '',
      updater: config.updater || null,
      targetClick: config.targetClick || null,
      suggester: config.suggester || null,
      suggests: config.suggests,

    };

    this.nodes = {
      wrapper: null,
      container: null,
      progress: null,
      input: null,
      inputHolder: null,
      suggests: null,
      linkContent: null,
      linkImage: null,
      linkTitle: null,
      linkDescription: null,
      linkText: null,
    };
    console.log('constructor', data);
    // 初始有值的情况
    this._data = JSON.stringify(data) !== '{}' ? data
      : {
        target: '',
        target_id: '',
        target_type: '',
        link: '',
        meta: {},
      };
    this.data = data;
  }

  /**
   * Renders Block content
   *
   * @public
   *
   * @returns {HTMLDivElement}
   */
  render() {
    this.nodes.wrapper = this.make('div', this.CSS.baseClass);
    this.nodes.wrapper.setAttribute('data-block-id', this.data.id);
    this.nodes.wrapper.setAttribute('data-block-type', 'link');
    this.nodes.container = this.make('div', this.CSS.container);

    this.nodes.inputHolder = this.makeInputHolder();
    this.nodes.linkContent = this.prepareLinkPreview();

    /**
     * If Tool already has data, render link preview, otherwise insert input
     */
    if (Object.keys(this.data.meta).length) {
      this.nodes.container.appendChild(this.nodes.linkContent);
      this.showLinkPreview(this.data.meta);
    } else {
      this.nodes.container.appendChild(this.nodes.inputHolder);
    }

    this.nodes.wrapper.appendChild(this.nodes.container);

    return this.nodes.wrapper;
  }

  /**
   * Return Block data
   *
   * @public
   *
   * @returns {LinkToolData}
   */
  save() {
    return this.data;
  }

  /**
   * Stores all Tool's data
   *
   * @param {LinkToolData} data
   */
  set data(data) {
    const compared = this.compareData(data, this._data);
    const hasMeta = !!(data.meta && Object.keys(data.meta).length);

    // 处理数据：
    if (hasMeta) {
      data.meta.title = untils.stripTags(data.meta.title);
      data.meta.description = untils.stripTags(data.meta.description);
    }

    this._data = Object.assign({}, {
      id: data.id || this._data.id,
      target: untils.stripTags(data.target) || this._data.target || '未命名',
      target_id: data.target_id || this._data.target_id,
      target_type: data.target_type || this._data.target_type,
      link: data.link || this._data.link,
      meta: data.meta || this._data.meta,
    });
    // 说明是新数据

    if (!this._data.id && this._data.target_id) {
      this._data.id = this.uuid();
      this.createLink(this._data);
    }
  }

  /**
   * 比较新老数据
   *
   * @param {*} newData
   * @param {*} oldData
   * @memberof LinkTool
   */
  compareData(newData, oldData) {
    // 如果新数据

    const compareObject = {}; // 0:没有变化，update:1,add:2

    for (const key in newData) {
      if (oldData[key] && typeof oldData[key] !== 'object') {
        compareObject[key] = newData[key] === oldData[key] ? 0 : 1;
      } else {
        compareObject[key] = 2;
      }

      if (oldData[key] && typeof oldData[key] === 'object') {
        compareObject[key] = JSON.stringify(newData[key]) === JSON.stringify(oldData[key]) ? 0 : 1;
      }
    }
    console.log('compareObject', newData, oldData, compareObject);
    // console.log('compareObject', compareObject);

    return compareObject;
  }

  /**
   * 关联视图更新
   *
   * @memberof LinkTool
   */
  updateView() {
    this.nodes.wrapper.id = this.data.id;
    if (this.data.meta && Object.keys(this.data.meta).length) {
      this.nodes.inputHolder.remove();
      this.nodes.container.appendChild(this.nodes.linkContent);
      this.showLinkPreview(this.data.meta);
    } else {
      this.nodes.container.appendChild(this.nodes.inputHolder);
    }
  }

  /**
   * Return Tool data
   *
   * @param {linkToolData} data update
   */
  async createLink(data) {
    if (typeof this.config.updater !== 'function') {
      console.warn('updater of link config must be a function');

      return;
    }

    const res = await this.config.updater(data, 'create');

    console.log('createLink', res, data);
  }

  /**
   * Return Tool data
   *
   * @returns {LinkToolData} data
   */
  get data() {
    return this._data;
  }

  /**
   * @returns {object} - Link Tool styles
   * @class
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      input: this.api.styles.input,

      /**
       * Tool's classes
       */
      container: 'link-tool',
      inputEl: 'link-tool__input',
      inputHolder: 'link-tool__input-holder',
      inputError: 'link-tool__input-holder--error',
      linkContent: 'link-tool__content',
      linkContentRendered: 'link-tool__content--rendered',
      linkImage: 'link-tool__image',
      linkTitle: 'link-tool__title',
      linkDescription: 'link-tool__description',
      linkText: 'link-tool__anchor',
      progress: 'link-tool__progress',
      progressLoading: 'link-tool__progress--loading',
      progressLoaded: 'link-tool__progress--loaded',
      suggests: 'link-tool__suggests',
      suggestsShow: 'link-tool__suggests--show',
      suggestsLoading: 'link-tool__suggests--loading',
      suggestsLoaded: 'link-tool__suggests--loaded',
      suggestsItem: 'link-tool__suggests-item',
      suggestsItemTitle: 'link-tool__suggests-item-title',
      suggestsItemContent: 'link-tool__suggests-item-content',
    };
  }

  /**
   * Prepare input holder
   *
   * @returns {HTMLElement} - url input
   */
  makeInputHolder() {
    const inputHolder = this.make('div', this.CSS.inputHolder);

    this.nodes.progress = this.make('label', this.CSS.progress);
    this.nodes.input = this.make('div', [this.CSS.input, this.CSS.inputEl], {
      contentEditable: true,
    });

    this.nodes.input.dataset.placeholder = this.api.i18n.t('Type Some Text To Link');

    this.nodes.input.addEventListener('paste', (event) => {
      // todo:外链解析
      // this.startFetching(event);

    });
    this.nodes.input.addEventListener('paste', this.setSuggestItem());
    // todo：这里要改成输入连接，搜索文档接口获得数据文档数据，生成block
    this.nodes.input.addEventListener('keydown', (event) => {
      const [ENTER, A] = [13, 65];
      const cmdPressed = event.ctrlKey || event.metaKey;

      switch (event.keyCode) {
        case ENTER:
          event.preventDefault();
          event.stopPropagation();
          this.setSuggestItem()(event);
          // this.startFetching(event);
          break;
        case A:
          if (cmdPressed) {
            // event.preventDefault();
            event.stopPropagation();
            // this.selectLinkUrl(event);
          }
          break;
      }
    });

    this.nodes.input.addEventListener('keyup', debounce(this.setSuggestItem(), 2000));
    this.nodes.input.addEventListener('focus', this.onInputFocus());
    this.nodes.input.addEventListener('blur', this.onInputBlur());

    this.nodes.suggests = this.make('div', this.CSS.suggests);
    inputHolder.appendChild(this.nodes.progress);
    inputHolder.appendChild(this.nodes.input);
    inputHolder.appendChild(this.nodes.suggests);

    return inputHolder;
  }

  /**
   * 对焦事件
   *
   * @param event
   */
  onInputFocus() {
    const that = this;

    return function (event) {
      that.nodes.suggests.classList.add(that.CSS.suggestsShow);
      // 如果是空的话，那么调取所
      if (that.nodes.input.textContent.trim().length === 0) {
        // 加载默认数据
        // console.log('default suggests', that.config.suggests);
        if (that.config.suggests && that.config.suggests.length > 0) {
          that.nodes.suggests.innerHTML = '';
          const itemsDOM = that.makeItems({
            items: that.config.suggests,
          });

          itemsDOM.forEach(item => {
            that.nodes.suggests.appendChild(item);
          });
        }
      }
    };
  }

  /**
   * 失去焦点事件
   *
   * @param event
   */
  onInputBlur() {
    const that = this;

    return function (event) {
      setTimeout(() => {
        that.nodes.suggests.classList.remove(that.CSS.suggestsShow);
      }, 500);
      // 如果是空的话，那么调取所
    };
  }

  /**
   * make input suggest dom
   *
   * @param event
   */
  setSuggestItem(event) {
    const that = this;

    return async function (event) {
      const value = that.nodes.input.textContent;
      const res = await that.config.suggester(value);

      // console.log(res);
      if (res) {
        that.nodes.suggests.innerHTML = '';
        const itemsDOM = that.makeItems(res);

        itemsDOM.forEach(item => {
          that.nodes.suggests.appendChild(item);
        });
      }
    };
  }

  /**
   * makeItems
   *
   * @param {*} event
   */
  makeItems({
    items,
    total,
  }) {
    const itemsDOM = [];

    items.forEach(item => {
      const itemDOM = this.make('div', this.CSS.suggestsItem);

      itemDOM.setAttribute('data-id', item.eid);
      itemDOM.setAttribute('data-type', 'essay');

      const itemTitle = this.make('div', this.CSS.suggestsItemTitle);

      itemTitle.innerHTML = item.name;
      const itemContent = this.make('div', this.CSS.suggestsItemContent);

      itemContent.innerHTML = item.summary;

      itemDOM.appendChild(itemTitle);
      itemDOM.appendChild(itemContent);
      itemDOM.addEventListener('click', this.selectSuggestItem(item));

      itemsDOM.push(itemDOM);
    });

    return itemsDOM;
  }

  /**
   * when user select suggest item
   *
   * @param item
   */
  selectSuggestItem(item) {
    const that = this;

    // console.log(item);
    console.log('select1', item);

    return function (event) {
      event.stopPropagation();
      event.preventDefault();
      // 走创建的逻辑：
      that.data = {
        target: item.name,
        target_id: item.eid,
        target_type: 'essay',
        link: item.eid,
        meta: {
          title: item.name,
          description: item.summary,
          image: {
            url: item.images ? item.images[0] : '',
          },
        },
      };
      that.updateView();
    };
  }

  /**
   * Activates link data fetching by url
   *
   * @param event
   */
  startFetching(event) {
    let url = this.nodes.input.textContent;

    if (event.type === 'paste') {
      url = (event.clipboardData || window.clipboardData).getData('text');
    }

    this.removeErrorStyle();
    // 如果是外部url，调用后端url即系
    this.fetchLinkData(url);
  }

  /**
   * If previous link data fetching failed, remove error styles
   */
  removeErrorStyle() {
    this.nodes.inputHolder.classList.remove(this.CSS.inputError);
    this.nodes.inputHolder.insertBefore(this.nodes.progress, this.nodes.input);
  }

  /**
   * Select LinkTool input content by CMD+A
   *
   * @param {KeyboardEvent} event
   */
  selectLinkUrl(event) {
    event.preventDefault();
    event.stopPropagation();

    const selection = window.getSelection();
    const range = new Range();

    const currentNode = selection.anchorNode.parentNode;
    const currentItem = currentNode.closest(`.${this.CSS.inputHolder}`);
    const inputElement = currentItem.querySelector(`.${this.CSS.inputEl}`);

    range.selectNodeContents(inputElement);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Prepare link preview holder
   *
   * @returns {HTMLElement}
   */
  prepareLinkPreview() {
    const holder = this.make('a', this.CSS.linkContent, {
      target: '_blank',
      rel: 'nofollow noindex noreferrer',
    });

    this.nodes.linkImage = this.make('div', this.CSS.linkImage);
    this.nodes.linkTitle = this.make('div', this.CSS.linkTitle);
    this.nodes.linkDescription = this.make('p', this.CSS.linkDescription);
    this.nodes.linkText = this.make('span', this.CSS.linkText);

    return holder;
  }

  /**
   * Compose link preview from fetched data
   *
   * @param {metaData} meta - link meta data
   */
  showLinkPreview({
    image,
    title,
    description,
    time,
  }) {
    console.log('showLinkPreview', this.nodes);
    this.nodes.container.appendChild(this.nodes.linkContent);

    if (image && image.url) {
      this.nodes.linkImage.style.backgroundImage = 'url(' + image.url + ')';
      this.nodes.linkContent.appendChild(this.nodes.linkImage);
    }

    if (title) {
      this.nodes.linkTitle.textContent = title;
      this.nodes.linkContent.appendChild(this.nodes.linkTitle);
    }

    if (description) {
      this.nodes.linkDescription.textContent = description;
      this.nodes.linkContent.appendChild(this.nodes.linkDescription);
    }

    this.nodes.linkContent.classList.add(this.CSS.linkContentRendered);
    this.nodes.linkContent.setAttribute('href', this.data.link);
    this.nodes.linkContent.setAttribute('data-target-type', this.data.target_type);
    this.nodes.linkContent.addEventListener('click', this.anchorClick(), true);
    this.nodes.linkContent.appendChild(this.nodes.linkText);

    try {
      this.nodes.linkText.textContent = (new URL(this.data.link)).hostname;
    } catch (e) {
      this.nodes.linkText.textContent = this.data.link;
    }
  }

  /**
   * bind a click event
   */
  anchorClick() {
    const config = this.config;

    return function (e) {
      e.preventDefault();
      e.stopPropagation();
      const targetType = e.currentTarget.getAttribute('data-target-type');
      const targetHref = e.currentTarget.getAttribute('href');

      console.log(config.targetClick);
      config.targetClick({
        targetType,
        targetHref,
      }, e);
      // console.log('anchorClick', data,);
    };
  }

  /**
   * Show loading progressbar
   */
  showProgress() {
    this.nodes.progress.classList.add(this.CSS.progressLoading);
  }

  /**
   * Hide loading progressbar
   */
  hideProgress() {
    return new Promise((resolve) => {
      this.nodes.progress.classList.remove(this.CSS.progressLoading);
      this.nodes.progress.classList.add(this.CSS.progressLoaded);

      setTimeout(resolve, 500);
    });
  }

  /**
   * If data fetching failed, set input error style
   */
  applyErrorStyle() {
    this.nodes.inputHolder.classList.add(this.CSS.inputError);
    this.nodes.progress.remove();
  }

  /**
   * Sends to backend pasted url and receives link data
   *
   * @param {string} url - link source url
   */
  async fetchLinkData(url) {
    this.showProgress();
    this.data = {
      link: url,
    };

    try {
      const {
        body,
      } = await (ajax.get({
        url: this.config.endpoint,
        data: {
          url,
        },
      }));

      this.onFetch(body);
    } catch (error) {
      this.fetchingFailed(this.api.i18n.t('Couldn\'t fetch the link data'));
    }
  }

  /**
   * Link data fetching callback
   *
   * @param {UploadResponseFormat} response
   */
  onFetch(response) {
    if (!response || !response.success) {
      this.fetchingFailed(this.api.i18n.t('Couldn\'t get this link data, try the other one'));

      return;
    }

    const metaData = response.meta;

    this.data = {
      meta: metaData,
    };

    if (!metaData) {
      this.fetchingFailed(this.api.i18n.t('Wrong response format from the server'));

      return;
    }

    this.hideProgress().then(() => {
      this.nodes.inputHolder.remove();
      this.showLinkPreview(metaData);
    });
  }

  /**
   * @param rawid
   */
  uuid(rawid) {
    rawid = rawid || 'xyxxxxxyx';
    const formatter = rawid + '-xxxyxxx-xxxxxxxx';

    return formatter.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0,
          v = c == 'x' ? r : (r & 0x3 | 0x8);

      return v.toString(16);
    });
  }

  /**
   * Handle link fetching errors
   *
   * @private
   *
   * @param {string} errorMessage
   */
  fetchingFailed(errorMessage) {
    this.api.notifier.show({
      message: errorMessage,
      style: 'error',
    });

    this.applyErrorStyle();
  }

  /**
   * Helper method for elements creation
   *
   * @param tagName
   * @param classNames
   * @param attributes
   * @returns {HTMLElement}
   */
  make(tagName, classNames = null, attributes = {}) {
    const el = document.createElement(tagName);

    if (Array.isArray(classNames)) {
      el.classList.add(...classNames);
    } else if (classNames) {
      el.classList.add(classNames);
    }

    for (const attrName in attributes) {
      el[attrName] = attributes[attrName];
    }
    // console.log('make', attributes, el);

    return el;
  }
}