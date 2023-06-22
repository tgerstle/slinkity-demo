<script>
    import Component2 from '../Component2.svelte';
    // using export to allow overrides via props

    export let json = {}
    export let name = 'p2 Name here';
    let count = 0;
  
    function handleClick() {
      count += 1;
    }
  </script>
  
  <style >
    h1 { color: purple }
  </style>
  
  <h1>Hello {name}</h1>
  <pre>{JSON.stringify(json,null,4)}</pre>
  
  <button on:click={handleClick}>
      Clicked {count} {count === 1 ? 'time' : 'times'}
  </button>
  <Component2 />