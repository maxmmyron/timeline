<script lang="ts">
  let that: HTMLElement | undefined = undefined;
  let clazz = "";

  export { that as this, clazz as class };
</script>

<article class="border border-gray-300 rounded-lg p-2 {clazz}" bind:this={that}>
  <slot />
</article>
