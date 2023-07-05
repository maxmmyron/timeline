<script>
  export let scrollX = 0;
  export let scale = 0;
  export let isPaused = false;
  export let runtime = 0;

  let width = 0;
  let previousPauseState = true;
  let canCalculateMouseRuntime = false;

  $: offset = Math.floor(scrollX / (width / sections));
  $: second = 2 ** scale;

  $: sections = Math.ceil(Math.max(3, Math.min(15, width / second)));

  const tickHeights = [1, 1, 1, 2, 1, 1];

  /**
   * @param e {MouseEvent}
   */
  const calculateMouseRuntime = (e) => {
    if (!canCalculateMouseRuntime) return;

    runtime = (e.clientX + scrollX) / second;
  };
</script>

<div
  class="tick-container"
  bind:clientWidth={width}
  on:mousemove={calculateMouseRuntime}
  on:mousedown={(e) => {
    previousPauseState = isPaused;
    isPaused = true;
    canCalculateMouseRuntime = true;
    calculateMouseRuntime(e);
  }}
  on:mouseup={() => {
    isPaused = previousPauseState;
    canCalculateMouseRuntime = false;
  }}
  style:width="{(sections + 1) * second}px"
  style="transform: translateX(-{scrollX % (width / sections)}px)"
>
  {#each { length: sections + 1 } as _, i}
    <div class="tick" style="width: {second}px; min-width: calc(100% / {sections});">
      <div style="position: absolute">{Math.floor((i + offset) * Math.max(1, width / sections / second) * 100) / 100}</div>
      {#each tickHeights as h}
        <div class="inner-tick" style="height: {h * 12}px" />
      {/each}
    </div>
  {/each}
</div>

<style>
  .tick-container {
    user-select: none;
    min-width: 100%;
    height: 48px;
    padding: 6px 0;
    display: flex;
  }

  .tick {
    display: flex;
    position: relative;
    height: 100%;
    border-left: 1px solid black;
    overflow: hidden;
    background-color: rgba(240 240 240 / 1);
  }

  .inner-tick {
    width: 100%;
  }
  .inner-tick:not(:first-child) {
    border-left: 1px solid black;
  }
</style>
