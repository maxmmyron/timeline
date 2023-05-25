<script>
  import Setting from "../components/Setting.svelte";
  import VideoMock from "../components/VideoMock.svelte";
  import "../app.css";
  import { onMount } from "svelte";

  let timelineScale = 50;
  let isPaused = true,
    previousPauseState = true;
  let canCalculateMouseRuntime = false;
  /**
   * @type {App.TimelineNode | null}
   */
  let curr = null;
  /**
   * @type {HTMLDivElement}
   */
  let timelineEl;
  let nodeIncrementor = 0;

  $: nodeCount = timeline.toArray().length;

  $: timelineWidth = timelineEl?.clientWidth || 0;
  $: duration = timeline.toArray().reduce((acc, curr) => acc + curr.duration, 0);
  $: ticks = Array.from({ length: timelineWidth / timelineScale }).map((_, i) => {
    if (i % 5 === 0) {
      return 10;
    } else if (i % 10 === 0) {
      return 20;
    }
    return 5;
  });

  $: scrubberPos = timeline.runtime * timelineScale;

  let lastTimestamp = 0;

  /**
   * @param timestamp {number}
   */
  const render = (timestamp) => {
    curr = timeline.head;
    let offset = 0;
    while (curr && offset + curr.duration < timeline.runtime) {
      curr.startOffset = offset;
      offset += curr.duration;
      curr.endOffset = offset;
      curr = curr.next;
    }

    if (isPaused) {
      lastTimestamp = timestamp;
      requestAnimationFrame(render);
      return;
    }

    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    timeline.runtime += delta / 1000;

    requestAnimationFrame(render);
  };

  /**
   * @param time {number}
   */
  const setPlayerTime = (time) => {
    isPaused = true;
    timeline.runtime = time === -1 ? duration : time;
  };

  onMount(() => requestAnimationFrame(render));

  /**
   * @type {App.Timeline}
   */
  const timeline = {
    head: null,
    tail: null,
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
    timeline.tail = null;
    timeline.runtime = 0;
  };

  const addNode = () => {
    /**
     * @type {App.TimelineNode}
     */
    const node = {
      id: Math.random().toString(36).substr(2, 9),
      next: null,
      duration: 4 - Math.random() * 2,
      endOffset: 0,
      startOffset: 0,
      title: `Node ${nodeIncrementor++}`,
    };

    if (timeline.head === null || timeline.tail === null) {
      timeline.head = node;
      timeline.tail = node;
    } else {
      timeline.tail.next = node;
      timeline.tail = node;
    }
  };

  const removeTailNode = () => {
    if (timeline.head === null || timeline.tail === null) return;
    if (timeline.head === timeline.tail) {
      timeline.head = null;
      timeline.tail = null;
    } else {
      /**
       * @type {App.TimelineNode}
       */
      let curr = timeline.head;
      while (curr.next && curr.next !== timeline.tail) {
        curr = curr.next;
      }
      curr.next = null;
      timeline.tail = curr;
    }
  };

  /**
   * @param e {MouseEvent}
   */
  const calculateMouseRuntime = (e) => {
    if (!canCalculateMouseRuntime) return;

    timeline.runtime = (e.clientX - timelineEl.offsetLeft) / timelineScale;
  };
</script>

<div id="settings-container">
  <h1>Settings</h1>
  <div>
    <Setting name="Timeline timelineScale">
      <input type="range" min="10" max="100" bind:value={timelineScale} />
      <p>{timelineScale}</p>
    </Setting>

    <Setting name="Node Management">
      <input type="button" value="Clear Timeline" on:click={clearTimeline} />
      <input type="button" value="Add Node" on:click={addNode} />
      <input type="button" value="Remove Tail Node" on:click={removeTailNode} />
      <p>{nodeCount} nodes</p>
    </Setting>

    <Setting name="Player">
      <input type="button" value="⏪" on:click={() => setPlayerTime(0)} />
      <input type="button" value={isPaused ? "▶️" : "⏸️"} on:click={() => (isPaused = !isPaused)} />
      <input type="button" value="⏩" on:click={() => setPlayerTime(-1)} />
      <div style="width: 100%; display:flex; gap: 16px;">
        <p>Current runtime: {timeline.runtime.toPrecision(4)}</p>
        <p>Total duration: {duration.toPrecision(4)}</p>
      </div>
    </Setting>
  </div>
</div>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  id="timeline-container"
  bind:this={timelineEl}
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
>
  {#if timeline.head !== null}
    {#each timeline.toArray() as node}
      <VideoMock scale={timelineScale} {node} currID={curr?.id || ""} />
    {/each}
  {/if}
  <div id="scrubber" style="left: {scrubberPos}px" />
  {#key timelineScale}
    {#each ticks as height, idx}
      <div class="timeline-tick" style="left: {idx * timelineScale}px; height: {height * 3}px" />
    {/each}
  {/key}
</div>

<div id="video">
  {#if curr !== null}
    <p>{curr.id}</p>
    <p>{curr.title}</p>
  {:else}
    <p>No video selected</p>
  {/if}
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

  #video {
    margin: 32px auto;
    aspect-ratio: 16/9;
    width: max(500px, 75%);
    border: 2px solid black;
    border-radius: 4px;
  }
</style>
