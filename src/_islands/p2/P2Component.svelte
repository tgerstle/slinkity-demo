<script>
    import { cname } from '../../_componentScripts/component_script.js';
    import Component2 from '../Component2.svelte';
    // using export to allow overrides via props
    export let name = 'p2 Name here';
    name = cname;
    let count = 0;
  
    function handleClick() {
      count += 1;
    }
  </script>
  
  <style >
    h1 { color: purple }
  </style>
  
  <h1>Hello {name}</h1>
  
  <button on:click={handleClick}>
      Clicked {count} {count === 1 ? 'time' : 'times'}
  </button>
  <Component2 />