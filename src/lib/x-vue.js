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