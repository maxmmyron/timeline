<script>
  let isRunning = false;

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

<div class="video-mock" class:mock-active={currID === node.id} style="width: {node.duration * scale}px">
  <h2>{node.title}</h2>
  <p>{node.duration}</p>
</div>

<style>
  .video-mock {
    overflow: clip;
    background-color: rgb(200 200 200 / 1);
    transition: background-color 0.15s ease-in-out;
    height: 128px;
    border-radius: 8px;
    padding: 4px;
    flex-shrink: 0;
  }

  .video-mock.mock-active {
    background-color: rgb(230 230 255 / 1);
  }
</style>
