<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import IconButton from "$lib/components/IconButton.svelte";
  import AutomationPanel from "./AutomationPanel.svelte";

  export let name: string | null = "";
  export let scalar: number;
  export let automation: App.Automation | null = null;
  export let defaultVal: number = 0;

  export let useSubgrid: boolean = false;
  export let supportsAutomation: boolean = false;

  /**
   * Whether or not the numerical override input can exceed the bounds defined
   * by the `min` and `max` props.
   */
  export let strictBounds: boolean = false;

  // TODO: could change to restProps? how?
  export let props: svelteHTML.HTMLProps<
    "input",
    svelteHTML.HTMLAttributes<any>
  > & {
    min: number;
    max: number;
    step: number;
  } = { min: -Infinity, max: Infinity, step: 0.01 };

  /**
   * The magnitude of the change in the scalar value when the mouse wheel is
   * scrolled.
   */
  export let mag: number = props.step;

  const dispatcher = createEventDispatcher<{ automationEditorOpen: boolean }>();

  let isHovered = false;
  export let isAutomationVisible = false;

  $: if (isAutomationVisible)
    dispatcher("automationEditorOpen", isAutomationVisible);

  let clazz = "";
  export { clazz as class };
</script>

<label
  class="{useSubgrid
    ? 'grid grid-cols-subgrid col-start-1 col-span-full'
    : 'flex gap-1'} items-center {clazz}"
>
  {#if name}
    <p class="text-ellipsis text-zinc-400 mr-1">{name}</p>
  {/if}
  <input
    class="h-6 w-11 px-1 disabled:opacity-50 disabled:cursor-not-allowed text-right rounded-lg bg-zinc-925 text-zinc-500"
    type="number"
    disabled={automation && automation.curves.length > 0}
    {...props}
    {...$$restProps}
    bind:value={scalar}
    alt="Manual property entry"
    on:change={(e) => {
      let parsed = parseFloat(e.currentTarget.value);
      if (strictBounds)
        scalar = Math.min(props.max, Math.max(props.min, parsed));
      else scalar = parsed;
    }}
    on:mouseenter={() => (isHovered = true)}
    on:mouseleave={() => (isHovered = false)}
    on:auxclick={(e) => {
      if (e.button === 1) scalar = defaultVal;
    }}
    on:wheel={(e) => {
      let mult = e.shiftKey ? 10 : 1;
      if (isHovered) {
        e.preventDefault();
        scalar = Math.min(
          props.max,
          Math.max(props.min, scalar - Math.sign(e.deltaY) * mag * mult)
        );
      }
    }}
    on:change
  />
  {#if supportsAutomation && automation}
    <IconButton
      name="Automation"
      alt="Edit automation"
      toggles
      bind:toggled={isAutomationVisible}
      showOutline={false}
      color="text-zinc-500"
    />
  {/if}
</label>

<style>
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
</style>
