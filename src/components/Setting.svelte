<script>
  /**
   * @type {string}
   */
  export let name;
</script>

<div class="settings">
  <h3>{name}</h3>
  <div>
    <slot />
  </div>
</div>

<style>
  .settings {
    margin: 4px 8px;
    max-width: 380px;
    padding: 16px;
    border: 2px solid black;
    border-radius: 4px;
  }

  h3 {
    margin-top: 0;
    margin-bottom: 16px;
  }

  .settings > div {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
