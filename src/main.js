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
    console.log('started ...');
    setTimeout(() => {
      this.test = 'hi world';
    },1000);
  }
});
