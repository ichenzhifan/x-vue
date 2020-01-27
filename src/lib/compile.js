import Watcher from './watcher';

// {{XXX}}
const INTER_TEXT_REG = /\{\{(.*)\}\}/;

/**
 * 将模板中的{{}}, @xxx等符号转化成实际的html标签.
 */
class Compile {
  constructor(el, vm) {
    this.$vm = vm;
    this.$el = document.querySelector(el);

    // 将模板移动到fragment中,更新完成后追加回来
    // 这样可以更加的有效率.
    this.$fragment = this.node2Fragment(this.$el);

    // 编译
    this.compile(this.$fragment);

    // 追加回dom中.
    this.$el.appendChild(this.$fragment);
  }

  /**
   * 将dom节点的元素移动到fragment中.
   * @param {HTMLElement} el 
   */
  node2Fragment(el) {
    const fragment = document.createDocumentFragment();

    let child;

    // 将el的第一个child赋值给child,
    // 如果child有值, 就循环继续.
    while (child = el.firstChild) {
      // appendChild, 是一个移动的操作.
      // child添加到fragment后, 会从el中移除.
      fragment.appendChild(child);
    };

    return fragment;
  }

  /**
   * 递归el, 分别处理文本节点, 元素节点等.
   * @param {HTMLElement} el 
   */
  compile(el) {
    // 获取所有的子节点.
    const childNodes = el.childNodes;

    // 转成真实的数组.
    Array.from(childNodes).forEach(node => {
      // 判断节点是否为元素. <p></p>
      const isElmentNode = node.nodeType === 1;

      // 是否为插值文本: {{xxx}}
      const isInterText = this.isInter(node);

      if (isElmentNode) {
        this.compileElementNode(node);
      } else if (isInterText) {
        this.compileTextNode(node);
      }

      // 递归子节点.
      if (node.childNodes && node.childNodes.length) {
        this.compile(node);
      }
    });
  }

  /**
   * 是否为插值表达式.
   * @param {HTMLElement} node 
   */
  isInter(node) {
    return node.nodeType === 3 && INTER_TEXT_REG.test(node.textContent);
  }

  textUpdator(node, value) {
    node.textContent = value;
  }

  htmlUpdator(node, value) {
    node.textContent = value;
  }

  modelUpdator(node, value) {
    node.value = value;
  }

  onModelChange = (exp, event) => {
    this.$vm[exp] = event.target.value;
  }

  update(node, exp, directive) {
    const updator = this[directive + 'Updator'];

    updator && updator(node, this.$vm[exp]);

    // 开始做依赖搜集工作.
    new Watcher(this.$vm, exp, value => {
      // 具体的更新操作, 当有新值变化时, 执行更新操作. 
      updator && updator(node, value);
    });
  }

  /**
   * 编译文本节点{{xxx}}
   * @param {HTMLElement} node 
   */
  compileTextNode(node) {
    INTER_TEXT_REG.test(node.textContent);
    const exp = RegExp.$1;

    this.update(node, exp, 'text');
  }

  /**
   * 编译元素节点 x-html, @click等等.
   * @param {HTMLElement} node 
   */
  compileElementNode(node) {
    const attrs = node.attributes;

    Array.from(attrs).forEach(attr => {
      if (attr.name === 'x-html') {
        this.compileHtmlAttr(node, attr);
      } else if (attr.name === '@click') {
        this.compileEventAttr(node, attr);
      } else if (attr.name === 'x-model') {
        this.compileModelAttr(node, attr);

        const onModelChange = event => this.onModelChange(attr.value, event);
        node.addEventListener('change', onModelChange);
      } else {
        // todo.
        console.log(attr);
      }
    });
  }

  /**
   * 将插值表达式替换成真实的data中的数据.
   * @param {HTMLElement} node 
   * @param {*}} attr 
   */
  compileHtmlAttr(node, attr) {
    this.update(node, attr.value, 'html');
    node.removeAttribute(attr.name);
  }

  compileModelAttr(node, attr) {
    this.update(node, attr.value, 'model');
    node.removeAttribute(attr.name);
  }

  /**
   * 绑定事件
   * @param {HTMLElement} node 
   * @param {*} attr 
   */
  compileEventAttr(node, attr) {
    node.addEventListener(attr.name.slice(1), this.$vm.$methods[attr.value].bind(this.$vm));
    node.removeAttribute(attr.name);
  }
}

export default Compile;