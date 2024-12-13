export function SEND_MESSAGE(type_: string, content_: [any]) {
    chrome.runtime.sendMessage({type: type_, content: content_})
}

export function RECIEVE_MESSAGE(type_: string) {
    chrome.runtime.sendMessage({type: type_}, (response) => {
        if(response){
            return response
        }
    });
}
