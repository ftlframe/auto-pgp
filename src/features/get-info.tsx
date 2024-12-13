class InfoFinder {
    USERMAIL = ''
    get_email(): string {
        const title_text = document.title
        // console.log(title_text)
        const email_regex = title_text.match(/[\w.-]+@[\w.-]+\.\w+/)
        if(email_regex) {
            this.USERMAIL = email_regex[0]
            return email_regex[0]
        }
        else {
            console.log('Cant find email!')
        }
    }
    
}
const infoFinderInstance = new InfoFinder();
export default infoFinderInstance