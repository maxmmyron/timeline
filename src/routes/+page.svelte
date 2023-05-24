<script>
  import Setting from "../components/Setting.svelte";
  import VideoMock from "../components/VideoMock.svelte";
  import "../app.css";

  let scale = 50;
  let isPaused = true,
    canCalculateMouseRuntime = false;
  let scrubberPos = 0;
  /**
   * @type {HTMLDivElement}
   */
  let timelineEl;

  $: timelineWidth = timelineEl?.clientWidth || 0;
  $: duration = timeline.toArray().reduce((acc, curr) => acc + curr.duration, 0);
  $: ticks = Array.from({ length: timelineWidth / scale }).map((_, i) => {
    if (i % 5 === 0) {
      return 10;
    } else if (i % 10 === 0) {
      return 20;
    }
    return 5;
  });

  /**
   * @type {App.Timeline}
   */
  const timeline = {
    head: null,
    curr: null,
    runtime: 0,
    toArray: () => {
      const arr = [];
      let curr = timeline.head;
      while (curr) {
        arr.push(curr);
        curr = curr.next;
      }
      return arr;
    },
  };

  const clearTimeline = () => {
    timeline.head = null;
    timeline.curr = null;
    timeline.runtime = 0;
  };

  let counter = 0;

  const addNode = () => {
    /**
     * @type {App.TimelineNode}
     */
    const node = {
      id: Math.random().toString(36).substr(2, 9),
      next: null,
      duration: 10 - Math.random() * 5,
      endOffset: 0,
      startOffset: 0,
      title: `Node ${counter++}`,
    };

    if (timeline.head === null || timeline.curr === null) {
      timeline.head = node;
      timeline.curr = node;
    } else {
      timeline.curr.next = node;
      timeline.curr = node;
    }
  };

  const removeTailNode = () => {
    if (timeline.head === null || timeline.curr === null) {
      return;
    }

    if (timeline.head === timeline.curr) {
      timeline.head = null;
      timeline.curr = null;
      return;
    }

    let curr = timeline.head;
    while (curr.next && curr.next.next) {
      curr = curr.next;
    }

    curr.next = null;
    timeline.curr = curr;
  };

  /**
   * @param e {MouseEvent}
   */
  const calculateMouseRuntime = (e) => {
    if (!canCalculateMouseRuntime) return;

    timeline.runtime = (e.clientX - timelineEl.offsetLeft) / scale;
    scrubberPos = timeline.runtime * scale;
  };
</script>

<div id="settings-container">
  <h1>Settings</h1>
  <div>
    <Setting name="Timeline Scale">
      <input type="range" min="10" max="100" bind:value={scale} />
      <p>{scale}</p>
    </Setting>

    <Setting name="Node Management">
      <input type="button" value="Clear Timeline" on:click={clearTimeline} />
      <input type="button" value="Add Node" on:click={addNode} />
      <input type="button" value="Remove Tail Node" on:click={removeTailNode} />
      <p>{timeline.toArray().length} nodes</p>
    </Setting>

    <Setting name="Player">
      <input type="button" value="⏪" />
      <input type="button" value={isPaused ? "▶️" : "⏸️"} on:click={() => (isPaused = !isPaused)} />
      <input type="button" value="⏩" />
      <div style="width: 100%; display:flex; gap: 16px;">
        <p>Current runtime: {timeline.runtime}</p>
        <p>Total duration: {duration}</p>
      </div>
    </Setting>
  </div>
</div>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  id="timeline-container"
  bind:this={timelineEl}
  on:mousemove={calculateMouseRuntime}
  on:mousedown={() => (canCalculateMouseRuntime = true)}
  on:mouseup={() => (canCalculateMouseRuntime = false)}
>
  {#if timeline.head !== null}
    {#each timeline.toArray() as node}
      <VideoMock {scale} {node} />
    {/each}
  {/if}
  <div id="scrubber" style="left: {scrubberPos}px" />
  {#each ticks as height, idx}
    <div class="timeline-tick" style="left: {idx * scale}px; height: {height * 3}px" />
  {/each}
</div>

<style>
  #settings-container {
    margin-bottom: 32px;
    padding: 16px;
    border: 2px solid black;
    border-radius: 4px;
  }

  #settings-container > div {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  #timeline-container {
    position: relative;
    display: flex;
    width: 100%;
    overflow-x: clip;
    height: calc(128px + 17px);
    border-top: 1px solid black;
    border-bottom: 1px solid black;
  }

  #scrubber {
    position: absolute;
    width: 2px;
    height: 128px;
    background-color: rgb(11 113 230 / 1);
    border-radius: 4px;
    pointer-events: none;
  }
  #scrubber::before {
    content: "";
    position: absolute;
    top: -8px;
    left: -5px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: rgb(11 113 230 / 1);
  }

  .timeline-tick {
    position: absolute;
    top: 0;
    width: 1px;
    background-color: rgb(11 113 230 / 0.5);
  }
</style>
