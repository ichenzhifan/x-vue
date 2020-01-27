# 简介
vue 2.0的版本中, 实现数据响应式的核心api是Object.defineProperty. 相信大部分使用过或了解过的同学都知道的. 但是vue是如何围绕这个核心api，来实现一个功能完整的MVVM框架, 相信能够完全了解的人不会很多.

下面也是围绕defineProperty接口, 模拟vue, 实现一个简版的MVVM框架. 其功能有:
- 支持插值文本 {{name}}
- 支持简单事件绑定: @click="onClick"
- 支持双向绑定: x-model="name"

# 简版的使用姿态, 和vue基本类似.
``` javascript
import XVue from './lib/x-vue';

const app = new XVue({
  el: '#demo',
  data: {
    test: 'hi',
    ok: 'ok',
    name: 'jack',
    foo: {
      bar: 'bar'
    }
  },
  methods:{
    onConfirm(){
      this.test = '11';
    }
  },
  created(){
    setTimeout(() => {
      this.test = 'hi world';
    },1000);
  }
});

```

# 核心概念
- 数据劫持. 利用defineProperty的get, set时机, 在get时, 可以做数据的依赖搜集. 在set时, 可以调用watcher的update方法, 做ui的更新.
- Dep: 管理着若干个Watcher, 和data中的属性是一对一的关系.
- Watcher：负责更新页面中的具体绑定, 每一个绑定表达式, 都会创建一个watcher.
- Compile: 编译器, 负责将模板中定义的插值表达式和指令, 转化成实际的数据或实际绑定.

# x-vue的实现.
x-vue.js

``` javascript
import Dep from './dep';
import Watcher from './watcher';
import Compile from './compile';

class Vue {
  constructor(options) {
    this.$options = options;
    this.$data = options.data;
    this.$el = options.el;
    this.$methods = options.methods;

    // 对数据进行观察.
    this.observe(this.$data);

    // 编译, 将模板中的{{xxx}}, 指令转化成实际的数据或事件绑定.
    this.compiler = new Compile(this.$el, this);

    if(options.created){
      options.created.call(this);
    }
  }

  observe(value) {
    if (!value || typeof value !== 'object') {
      return;
    }

    Object.keys(value).forEach(key => {
      this.defineReactive(value, key, value[key]);

      // 允许通过app.xxx的方式来访问$data
      this.proxyData(key);
    })
  }

  /**
   * 将$data的访问代理到vue的实例上.
   * @param {String} key 
   */
  proxyData(key) {
    Object.defineProperty(this, key, {
      get() {
        return this.$data[key];
      },
      set(newVal) {
        this.$data[key] = newVal;
      }
    })
  }

  /**
   * 定义set,get方法, 对data的设置和访问进行拦截.
   * @param {Object} obj 
   * @param {String} key 
   * @param {Any} val 
   */
  defineReactive(obj, key, val) {
    // 递归操作, 因为data中的值可能是对象嵌套.
    this.observe(val);

    // 创建一个对应的Dep.
    // 每个dep和data中的属性是一一对应的.
    const dep = new Dep();

    // 给obj定义属性.
    Object.defineProperty(obj, key, {
      get() {
        // 做依赖搜集
        if(Dep.target){
          dep.add(Dep.target);
        }

        return val;
      },
      set(newVal) {
        if (newVal === val) {
          return;
        }

        val = newVal;
        
        // 通知界面更新.
        dep.notify();
      }
    })
  }
}

export default Vue;
```

### 代码解释.
- 在vue的构造函数中, 将options中的data, el，methods保持到vue的实例中. 对data数据进行观察, 使其具备响应式. 调用compile函数, 将模板转化中实际的数据；调用created生命周期.
- defineReactive: 利用Object.defineProperty，做数据劫持. 在get中, 做依赖搜集. set中, 调用notify方法, 执行ui更新逻辑.
- proxyData: 对$data的访问代理到vue的实例上. 即this.test等同于this.$data.test.

# dep.js

``` javascript
/**
 * 管理着若干个watcher, 和data中的属性是一对一的关系.
 */
class Dep{
  constructor(){
    this.deps = [];
  }

  /**
   * 新增一个watcher.
   * @param {Watcher} dep 
   */
  add(dep){
    // dep是一个watcher.
    this.deps.push(dep);
  }

  /**
   * 通知变更.
   */
  notify(){
    this.deps.forEach(dep => dep.update());
  }
}

export default Dep;

```
dep的代码相对比较的简单, 提供一个add和notify方法. 
- add, 允许添加一个新的watcher, watcher中需要包含一个update方法, 用来做UI的更新逻辑.
- notify: 通知变更.

# watcher.js
``` javascript
import Dep from './dep';

/**
 * 负责更新页面中具体的绑定.
 * 每一个绑定表达式, 就对应一个watcher.
 */
class Watcher {
  // vm: vue的实例
  // key: data中的一个属性.
  constructor(vm, key, cb) {
    this.vm = vm;
    this.key = key;
    this.cb = cb;

    // 触发依赖搜集.
    Dep.target = this;
    this.vm[this.key];
    Dep.target = null;
  }

  update() {
    this.cb && this.cb.call(this.vm, this.vm[this.key]);
  }
}

export default Watcher;
```
构造函数中, 有几行代码看起来比较的费劲.
- Dep.target = this; 将watcher的实例保持到Dep.target属性中. 在x-vue的defineReactive的get方法中, 会使用到target值. 代码如下:
``` javascript
get() {
    // 做依赖搜集
    if(Dep.target){
      dep.add(Dep.target);
    }

    return val;
  },
```

- this.vm[this.key]; 显示的调用一个, 以触发data中的get方法. 做绑定表达式的依赖搜集.

# compile.js
``` javascript
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
    // textUpdator, htmlUpdator，modelUpdator等.
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
```

这里需要注意的是update方法. 会new一个Watcher的实例, 也就是说每一个绑定表达式, 都会产生一个watcher. 第三个参数是一个回调.

## vue中data的属性的值更新时的流程.
- 数据更新时,调用x-vue中set方法被触发.
- set方法中, 调用dep的notify方法.
- notify方法, 调用watcher中的update方法
- update方法，执行内部的callback方法. 传递最新的值.
- callback方法, 在compile的update中, 在新建watcher的第三个参数中定义节点的更新逻辑.
``` javascript
// 开始做依赖搜集工作.
new Watcher(this.$vm, exp, value => {
  // 具体的更新操作, 当有新值变化时, 执行更新操作. 
  updator && updator(node, value);
});
```

# 掘金链接
[Vue中数据响应式, 手写简版的, 你会吗?](https://juejin.im/post/5e2e8f916fb9a02fe971fec7)


