const string =
  "Quantum mechanics is the field of physics that explains how extremely small objects simultaneously have the characteristics of both particles (tiny pieces of matter) and waves (a disturbance or variation that transfers energy). Physicists call this the wave-particle duality. The particle portion of the wave - particle duality involves how objects can be described as quanta. A quanta is the smallest discrete unit(such as a particle) of a natural phenomenon in a system where the units are in a bound state.For example, a quanta of electromagnetic radiation, or light, is a photon.A bound state is one where the particles are trapped.One example of a bound state is the electrons, neutrons, and protons that are in an atom. To be quantized means the particles in a bound state can only have discrete values for properties such as energy or momentum.For example, an electron in an atom can only have very specific energy levels.This is different from our world of macroscopic particles, where these properties can be any value in a range.A baseball can have essentially any energy as it is thrown, travels through the air, gradually slows down, then stops. At the same time, tiny quantized particles such as electrons can also be described as waves.Like a wave in the ocean in our macroscopic world - the world we can see with our eyes-- waves in the quantum world are constantly shifting.In quantum mechanics, scientists talk about a particle's “wave function.” This is a mathematical representation used to describe the probability that a particle exists at a certain location at a certain time with a certain momentum. The world of quantum mechanics is very different from how we usually see our macroscopic world, which is controlled by what physicists call classical mechanics.Quantum mechanics grew out of the tremendous progress that physicists made in the early 20th century toward understanding the microscopic world around us and how it differed from the macroscopic world. As with many things in science, new discoveries prompted new questions.Prior to this time, scientists thought that light existed as an electromagnetic wave and that electrons existed as discrete, point - like particles.However, this created problems in explaining various phenomena in physics.These include blackbody radiation—the emission of light from objects based on their temperature.Quantum mechanics also helped explain the structure of the atom.It helped make sense of the photoelectric effect, which involves how materials emit electrons when those materials are hit with light of certain wavelengths.By explaining how things can be both particles and waves, quantum mechanics solved these problems. This new knowledge had profound effects in science and technology.Quantum mechanics led to the development of things like lasers, light - emitting diodes, transistors, medical imaging, electron microscopes, and a host of other modern devices.Your cell phone would not exist without the science of quantum mechanics!";

export function generatePlaceholder() {
  const words = string.split(" ");
  const paragraph = [];
  for (let i = 0; i < 20; i++) {
    paragraph.push(words[Math.floor(Math.random() * words.length)]);
  }
  return paragraph.join(" ").toLowerCase();
}

export async function generateParagraph() {
  try {
    const response = await fetch("http://metaphorpsum.com/paragraphs/10");

    if (!response.ok) {
      throw new Error();
    }

    const data = await response.text();
    const paragraph = data.split(`\n`).join(" ");

    return paragraph;
  } catch (error) {
    console.log(error);
    const paragraph = generatePlaceholder();
    return paragraph;
  }
}