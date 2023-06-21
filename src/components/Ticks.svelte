<script>
  export let scrollX = 0;

  let width = 0;
</script>

<p>{scrollX % (width / 6)}</p>
<div class="tick-container" bind:clientWidth={width} style="transform: translateX(-{scrollX % (width / 6)}px)">
  {#each { length: 6 } as _, i}
    <div class="tick">{i}</div>
  {/each}
</div>

<style>
  .tick-container {
    width: 120%;
    height: 48px;
    background-color: lightblue;
    padding: 6px 0;
    display: flex;
  }

  .tick {
    width: 20%;
    height: 100%;
    background-color: white;
    border-radius: 4px;
    border: 1px solid black;
  }
</style>
