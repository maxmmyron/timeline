<script>
  export let scrollX = 0;

  let width = 0;

  $: offset = Math.floor(scrollX / (width / 6));

  const tickHeights = [1, 1, 1, 2, 1, 1];
</script>

<p>{scrollX % (width / 6)}</p>
<div class="tick-container" bind:clientWidth={width} style="transform: translateX(-{scrollX % (width / 6)}px)">
  {#each { length: 6 } as _, i}
    <div class="tick">
      <div style="absolute">{i + offset}</div>
      {#each tickHeights as h}
        <div class="inner-tick" style="height: {h * 12}px" />
      {/each}
    </div>
  {/each}
</div>

<style>
  .tick-container {
    width: 120%;
    height: 48px;
    background-color: rgba(240 240 240 / 1);
    padding: 6px 0;
    display: flex;
  }

  .tick {
    display: flex;
    width: 20%;
    height: 100%;
    border-left: 1px solid black;
  }

  .inner-tick {
    width: 100%;
  }
  .inner-tick:not(:first-child) {
    border-left: 1px solid black;
  }
</style>
