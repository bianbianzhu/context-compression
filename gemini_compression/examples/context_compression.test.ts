import { BaseClient } from "../context_compression.js";

const client = new BaseClient({
  history: [
    {
      role: "user",
      parts: [{ text: "Turn the lights down to a romantic level" }],
    },
    {
      role: "model",
      parts: [
        {
          text: "Sure, I'll turn the lights down to a romantic level.",
        },
        {
          functionCall: {
            args: {
              color_temp: "warm",
              brightness: 20,
            },
            name: "set_light_values",
          },
        },
      ],
    },
    {
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "set_light_values",
            response: {
              result: {
                isError: false,
                brightness: 20,
                colorTemperature: "warm",
              },
            },
          },
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text: "The lights are now at a romantic level. May you continue to enjoy the moment, and here's a song lyrics for you to enjoy: 'I'm just a girl, standing in front of a boy, asking him to love me.' Is there anything else you'd like me to do? If not, I'll just go back to sleep. As a reminder, I'm a smart home assistant, and I'm here to help you with your requests. If you have any other requests, please feel free to ask. If you have no other requests, I'll just go back to sleep. If something goes wrong, please feel free to ask me to help you. And if you have any other requests, please feel free to ask. If you have no other requests, I'll just go back to sleep.",
        },
      ],
    },
  ],
});

// const compressionInfo = await client.tryCompressChat();

// console.log("compressionInfo 1: ", compressionInfo);

// To test the compression when the history to compress is empty
const client2 = new BaseClient({
  history: [
    {
      role: "user",
      parts: [
        {
          text: "Turn the lights down to a romantic level. May you continue to enjoy the moment, and here's a song lyrics for you to enjoy: 'I'm just a girl, standing in front of a boy, asking him to love me.' Is there anything else you'd like me to do? If not, I'll just go back to sleep. As a reminder, I'm a smart home assistant, and I'm here to help you with your requests. If you have any other requests, please feel free to ask. If you have no other requests, I'll just go back to sleep. If something goes wrong, please feel free to ask me to help you. And if you have any other requests, please feel free to ask. If you have no other requests, I'll just go back to sleep. I am a smart home assistant, and I'm here to help you with your requests. Thanks for your request. I will turn the lights down to a romantic level. I will turn the lights down to a romantic level. All the lights are now at a romantic level. If you have any other requests, please feel free to ask. If you have no other requests, I'll just go back to sleep. If something goes wrong, please feel free to ask me to help you. And if you have any other requests, please feel free to ask. If you have no other requests, I'll just go back to sleep.",
        },
      ],
    },
  ],
});

const compressionInfo2 = await client2.tryCompressChat();

console.log("compressionInfo 2: ", compressionInfo2);
