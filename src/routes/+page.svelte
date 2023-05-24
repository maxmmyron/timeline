<script>
  import Setting from "../components/Setting.svelte";
  import VideoMock from "../components/VideoMock.svelte";

  let scale = 50;
  let isPaused = true;

  /**
   * @type {App.Timeline}
   */
  const timeline = {
    head: null,
    curr: null,
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
</script>

<div id="settings-container">
  <h1>Settings</h1>
  <div>
    <Setting name="Timeline Scale">
      <input type="range" min="10" max="100" bind:value={scale} />
    </Setting>

    <Setting name="Node Management">
      <input type="button" value="Clear Timeline" on:click={clearTimeline} />
      <input type="button" value="Add Node" on:click={addNode} />
      <input type="button" value="Remove Tail Node" on:click={removeTailNode} />
    </Setting>

    <Setting name="Player">
      <input type="button" value="⏪" />
      <input type="button" value={isPaused ? "▶️" : "⏸️"} on:click={() => (isPaused = !isPaused)} />
      <input type="button" value="⏩" />
    </Setting>
  </div>
</div>

{#if timeline.head !== null}
  <div id="timeline-container">
    {#each timeline.toArray() as node}
      <VideoMock {scale} {node} />
    {/each}
  </div>
{:else}
  <div class="timeline-empty">Timeline is empty</div>
{/if}

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
    display: flex;
    width: 100%;
    overflow-y: hidden;
    height: calc(128px + 17px);
  }
</style>
