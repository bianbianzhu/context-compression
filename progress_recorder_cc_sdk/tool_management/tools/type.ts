type TextContent = {
  text: string;
  type: "text";
};

export type ContentResult = {
  content: TextContent[];
  isError: boolean;
};
