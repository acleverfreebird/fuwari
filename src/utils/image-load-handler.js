document.addEventListener("DOMContentLoaded", () => {
	const images = document.querySelectorAll(".image-container img");
	images.forEach((img) => {
		if (img.complete) {
			img.parentElement.parentElement.style.background = "none";
		} else {
			img.onload = () => {
				img.parentElement.parentElement.style.background = "none";
			};
		}
	});
});
