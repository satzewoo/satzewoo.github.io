<script>
	import '../app.css';

	let { children } = $props();
</script>

<div class="frame">
	{@render children()}
</div>
