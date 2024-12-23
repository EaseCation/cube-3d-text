import React, { createContext, useContext, ReactNode } from "react";
import { message } from "antd";
import { MessageInstance } from "antd/es/message/interface";

const MessageContext = createContext<MessageInstance | null>(null);

interface MessageProviderProps {
    children: ReactNode;
}

export const MessageProvider: React.FC<MessageProviderProps> = ({ children }) => {
    const [messageApi, contextHolder] = message.useMessage();

    return (
        <MessageContext.Provider value={messageApi}>
            {contextHolder}
            {children}
        </MessageContext.Provider>
    );
};

export const useMessage = () => {
    return useContext(MessageContext);
};