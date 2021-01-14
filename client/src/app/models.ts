export interface UserRegistrationData {
    email: string,
    username: string,
    password: string
}

export interface UserProfileData {
    income: number,
    save: number,
    spend: number,
    donate: number,
    invest: number
}

export interface UserSummary {
    save: number,
    spend: number,
    donate: number,
    invest: number
}

export interface TransactionData {
    title: string,
    amount: number,
    comments: string,
    category: string
}