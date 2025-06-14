function randomTime(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function berkedip() {	
	const kedip = randomTime(1,2);
	const eyes = document.getElementsByClassName("eyes")

	// console.log(kedip)
    eyes[0].style.animation = 'none'; // Reset the animation
    eyes[1].style.animation = 'none'; // Reset the animation

    // Trigger reflow to reset animation
    void eyes[0].offsetWidth;

    // Set the animation again
    eyes[0].style.animation = `eyes .30s ease 0.1s ${kedip}`;
    eyes[1].style.animation = `eyes .30s ease 0.1s ${kedip}`;
}




window.addEventListener("load",()=>{
	console.log("LOADED")
	const face = document.getElementById("face")

	face.addEventListener("click", berkedip);
	setInterval(berkedip, 15000)

})
