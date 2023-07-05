<script>
  /**
   * @type {number}
   */
  export let scale;
  /**
   * @type {App.TimelineNode}
   */
  export let node;
  /**
   * @type {string}
   */
  export let currID;
</script>

<button class="video-mock" class:mock-active={currID === node.id} style="width: {node.duration * 2 ** scale}px">
  <div class="video-inner">
    <h2>{node.title}</h2>
    <p>{node.duration}</p>
  </div>
</button>

<style>
  .video-mock {
    overflow: clip;
    background-color: rgb(200 200 200 / 1);
    transition: background-color 0.15s ease-in-out;
    height: 128px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .video-inner {
    width: 100%;
    height: 100%;
    padding: 4px;
  }

  .video-mock.mock-active {
    background-color: rgb(230 230 255 / 1);
  }
</style>
