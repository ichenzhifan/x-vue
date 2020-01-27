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