// Caption-only until reviewed recordings are added to VOICE_FILES.
import {registerLines,setVoiceFiles,say} from './audio.js';
import {VOICE_FILES} from './stage8-voice-files.js';
export {VOICE_FILES};
export const LINES=Object.freeze({
  "st8_story_01": [
    "NARRATOR",
    "Cairhien was empty when Riley got there. The Tower embassy had taken the Dragon Reborn — shielded, folded into a wooden chest — and ridden hard for Tar Valon."
  ],
  "st8_story_02": [
    "NARRATOR",
    "They caught up at Dumai's Wells: three stone wells in a sea of grass, a ring of wagons, and the Shaido coming over every hill."
  ],
  "st8_story_03": [
    "NARRATOR",
    "And somewhere between Cairhien and here, Moiraine had fallen through a twisted redstone doorway with Lanfear. Only one of them came back."
  ],
  "st8_rand_box_01": [
    "RAND",
    "Six of them. Always six, holding the shield. I can feel every one."
  ],
  "st8_lews_01": [
    "LEWS THERIN",
    "Every shield has a seam. Feel for where the women tire."
  ],
  "st8_rand_box_02": [
    "RAND",
    "Get out of my head!"
  ],
  "st8_lews_02": [
    "LEWS THERIN",
    "It is my head too. Push. There — where the weave thins."
  ],
  "st8_rand_box_03": [
    "RAND",
    "I can't… reach it!"
  ],
  "st8_lews_03": [
    "LEWS THERIN",
    "Then wait. Someone is coming. A boy who channels… and a girl who dances."
  ],
  "riley_st8_story_01": [
    "RILEY",
    "Rand's in that box. And Twinkle Toes is down there with them."
  ],
  "riley_st8_story_02": [
    "RILEY",
    "Okay. Final round."
  ],
  "st8_perrin_01": [
    "PERRIN",
    "Two Rivers! Loose!"
  ],
  "st8_perrin_02": [
    "PERRIN",
    "Riley. Go — we'll hold the hill."
  ],
  "st8_loial_01": [
    "LOIAL",
    "Riley! This is far too hasty — but I will hold this side!"
  ],
  "st8_perrin_wolves_01": [
    "PERRIN",
    "Wolves — with me!"
  ],
  "st8_mat_join_01": [
    "MAT",
    "Dice have been rattling in my head for three days. Something lucky's about to happen — probably to me."
  ],
  "riley_st8_mat_01": [
    "RILEY",
    "Mat?! What are you —"
  ],
  "st8_mat_join_02": [
    "MAT",
    "Rescuing Rand. Again. Call me when it gets thick."
  ],
  "st8_taim_intro_01": [
    "TAIM",
    "The Black Tower answers the Dragon Reborn."
  ],
  "st8_taim_kill_01": [
    "TAIM",
    "Asha'man, kill!"
  ],
  "riley_st8_taim_01": [
    "RILEY",
    "Wait — which side are they killing?!"
  ],
  "riley_st8_volley_01": [
    "RILEY",
    "Jump the dirt. Dodge the fire. Got it."
  ],
  "st8_sister_01": [
    "BLACK AJAH",
    "Hold the circle!"
  ],
  "st8_sister_02": [
    "BLACK AJAH",
    "The Lady wants the girl unharmed. The boy, she did not mention."
  ],
  "riley_st8_lady_01": [
    "RILEY",
    "Who's 'the Lady'?"
  ],
  "st8_tt_circle_01": [
    "TWINKLE TOES",
    "Bubby! They won't let me out!"
  ],
  "riley_st8_circle_01": [
    "RILEY",
    "Hang on, Twinkle Toes!"
  ],
  "st8_rand_callandor_01": [
    "RAND",
    "Riley! Callandor — in the wagon. Take it!"
  ],
  "riley_st8_callandor_01": [
    "RILEY",
    "Okay, glass sword. Show me what you've got."
  ],
  "riley_st8_circle_02": [
    "RILEY",
    "Circle's broken!"
  ],
  "st8_rand_free_01": [
    "RAND",
    "Free. Light, I'm free. Riley — call, and I'll come."
  ],
  "st8_mat_handover_01": [
    "MAT",
    "And that's my luck spent. Rand's turn. Try to need less rescuing!"
  ],
  "st8_tt_link_01": [
    "TWINKLE TOES",
    "Bubby, I can channel too! I've been practicing!"
  ],
  "riley_st8_link_01": [
    "RILEY",
    "Since when?!"
  ],
  "st8_tt_link_02": [
    "TWINKLE TOES",
    "Only a girl can start a link. Hold my hand!"
  ],
  "riley_st8_link_02": [
    "RILEY",
    "Okay. Together."
  ],
  "st8_lanfear_intro_01": [
    "LANFEAR",
    "So this is the little queen."
  ],
  "st8_tt_lanfear_01": [
    "TWINKLE TOES",
    "Who are YOU?"
  ],
  "st8_lanfear_motive_01": [
    "LANFEAR",
    "A hall of painted knights, roast chicken and a paper crown — and they named YOU the Queen of Love and Beauty. At Medieval Times!"
  ],
  "st8_lanfear_motive_02": [
    "LANFEAR",
    "I have been the most beautiful woman in the world for three thousand years. That title is MINE."
  ],
  "st8_tt_lanfear_02": [
    "TWINKLE TOES",
    "It's a paper crown, lady."
  ],
  "riley_st8_lanfear_01": [
    "RILEY",
    "You're jealous of a dinner show?"
  ],
  "st8_lanfear_intro_02": [
    "LANFEAR",
    "I will have that crown. And I will have her."
  ],
  "st8_lanfear_final_01": [
    "LANFEAR",
    "I am the queen of love and beauty!"
  ],
  "st8_lanfear_final_02": [
    "LANFEAR",
    "Not again! Not the snake people! Ahhhhhhh!"
  ],
  "st8_tt_final_01": [
    "TWINKLE TOES",
    "Bubby you saved me! But what took you so long?"
  ],
  "riley_st8_final_01": [
    "RILEY",
    "Too many snack breaks."
  ],
  "st8_rand_clear_01": [
    "RAND",
    "The Shaido are breaking. Riley — Twinkle Toes — thank you."
  ],
  "st8_perrin_clear_01": [
    "PERRIN",
    "Let's get you two home."
  ],
  "st8_story_end_01": [
    "NARRATOR",
    "The Wheel turns, and Riley brought his sister home. One day it will turn toward the Last Battle. But not today."
  ],
  "st8_taim_kill_02": [
    "TAIM",
    "Asha'man, kill!"
  ],
  "st8_taim_kill_03": [
    "TAIM",
    "Asha'man, kill!"
  ],
  "st8_tt_mirror_01": [
    "TWINKLE TOES",
    "Silver crown's the real one!"
  ],
  "st8_lanfear_p2_01": [
    "LANFEAR",
    "A carnation from a knight on a horse?! I ruled the Age of Legends!"
  ],
  "st8_lanfear_p3_01": [
    "LANFEAR",
    "Enough games. Burn, both of you!"
  ],
  "st8_lanfear_hurt_01": [
    "LANFEAR",
    "You dare?!"
  ],
  "st8_lanfear_clash_01": [
    "LANFEAR",
    "You push against ME?"
  ],
  "riley_st8_clash_01": [
    "RILEY",
    "Twinkle Toes — push!"
  ],
  "st8_tt_clash_01": [
    "TWINKLE TOES",
    "I'm pushing!"
  ],
  "riley_st8_linkfire_01": [
    "RILEY",
    "Together — fire!"
  ],
  "riley_st8_call_01": [
    "RILEY",
    "Mat! Your luck!"
  ],
  "riley_st8_call_02": [
    "RILEY",
    "Rand, now!"
  ],
  "riley_st8_wait_01": [
    "RILEY",
    "Not yet — give it a breath."
  ],
  "st8_mat_call_01": [
    "MAT",
    "Time to roll the dice!"
  ],
  "st8_mat_call_02": [
    "MAT",
    "Snake eyes for them!"
  ]
});
export const STAGE8_VOICES=Object.freeze(Object.keys(LINES));
registerLines(LINES);setVoiceFiles(STAGE8_VOICES,VOICE_FILES);
export function stage8Say(id,caption,interrupt=true){return say(id,caption,interrupt);}
