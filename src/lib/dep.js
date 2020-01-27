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
