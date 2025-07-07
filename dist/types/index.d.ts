export type User = {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'staff' | 'user';
    points: number;
    avatarUrl: string;
    checkInStreak?: number;
    lastCheckIn?: string;
    isEmailVerified: boolean;
    referralCode?: string;
    referredBy?: string;
    consecutiveCheckIns: number;
    lastCheckInDate?: string;
    totalSuccessfulReferrals: number;
    createdAt: string;
};
export type Prediction = {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    'data-ai-hint'?: string;
    answer: string;
    pointsCost: number;
    status: 'active' | 'finished';
    authorId: string;
    createdAt: string;
    winnerId?: string | {
        id: string;
        name: string;
        avatarUrl: string;
    };
};
export type UserPrediction = {
    id: string;
    userId: string;
    user: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    predictionId: string;
    guess: string;
    isCorrect: boolean;
    pointsSpent: number;
    createdAt: string;
};
export type Feedback = {
    id: string;
    userId: string;
    user: User;
    feedbackText: string;
    status: 'pending' | 'approved' | 'rejected';
    awardedPoints?: number;
    createdAt: string;
};
export type PointTransaction = {
    id: string;
    userId: string;
    user: {
        name: string;
    };
    adminId?: string;
    admin?: {
        name: string;
    };
    amount: number;
    reason: 'check-in' | 'referral' | 'feedback' | 'prediction-win' | 'admin-grant' | 'streak-bonus';
    createdAt: string;
    notes?: string;
};
export type Question = {
    id: string;
    questionText: string;
    imageUrl?: string;
    answer: string;
    isPriority: boolean;
    status: 'active' | 'inactive';
    displayCount: number;
    correctAnswerCount: number;
    points: number;
    createdAt: string;
};
export type Referral = {
    id: string;
    referrerId: string;
    referredUserId: string;
    referredUser: {
        name: string;
        createdAt: string;
        consecutiveCheckIns: number;
    };
    status: 'pending' | 'completed';
    createdAt: string;
};
export type CheckIn = {
    id: string;
    userId: string;
    questionId: string;
    answer: string;
    isCorrect: boolean;
    pointsEarned: number;
    checkInDate: string;
    createdAt: string;
};
export type SystemSettings = {
    id: string;
    settingKey: string;
    settingValue: number;
    description: string;
};
export type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'staff' | 'user';
    isEmailVerified: boolean;
};
export type LoginCredentials = {
    email: string;
    password: string;
};
export type RegisterData = {
    name: string;
    email: string;
    password: string;
    referralCode?: string;
};
export interface AuthRequest extends Request {
    user?: AuthUser;
}
export type OrderCustomer = {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
    billing: {
        first_name: string;
        last_name: string;
        company: string;
        address_1: string;
        address_2: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
        email: string;
        phone: string;
    };
    shipping: {
        first_name: string;
        last_name: string;
        company: string;
        address_1: string;
        address_2: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
};
export type OrderLineItem = {
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    taxes: Array<{
        id: number;
        total: string;
        subtotal: string;
    }>;
    meta_data: Array<{
        id: number;
        key: string;
        value: string;
    }>;
    sku: string;
    price: number;
    image: {
        id: number;
        src: string;
    };
    parent_name: string;
};
export type WooCommerceOrder = {
    id: number;
    parent_id: number;
    status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed' | 'trash' | 'ecpay-shipping';
    currency: string;
    version: string;
    prices_include_tax: boolean;
    date_created: string;
    date_modified: string;
    discount_total: string;
    discount_tax: string;
    shipping_total: string;
    shipping_tax: string;
    cart_tax: string;
    total: string;
    total_tax: string;
    customer_id: number;
    order_key: string;
    billing: OrderCustomer['billing'];
    shipping: OrderCustomer['shipping'];
    payment_method: string;
    payment_method_title: string;
    transaction_id: string;
    customer_ip_address: string;
    customer_user_agent: string;
    created_via: string;
    customer_note: string;
    date_completed: string | null;
    date_paid: string | null;
    cart_hash: string;
    number: string;
    meta_data: Array<{
        id: number;
        key: string;
        value: any;
    }>;
    line_items: OrderLineItem[];
    tax_lines: Array<{
        id: number;
        rate_code: string;
        rate_id: number;
        label: string;
        compound: boolean;
        tax_total: string;
        shipping_tax_total: string;
        rate_percent: number;
        meta_data: Array<{
            id: number;
            key: string;
            value: string;
        }>;
    }>;
    shipping_lines: Array<{
        id: number;
        method_title: string;
        method_id: string;
        instance_id: string;
        total: string;
        total_tax: string;
        taxes: Array<{
            id: number;
            total: string;
        }>;
        meta_data: Array<{
            id: number;
            key: string;
            value: string;
        }>;
    }>;
    fee_lines: Array<{
        id: number;
        name: string;
        tax_class: string;
        tax_status: string;
        total: string;
        total_tax: string;
        taxes: Array<{
            id: number;
            total: string;
            subtotal: string;
        }>;
        meta_data: Array<{
            id: number;
            key: string;
            value: string;
        }>;
    }>;
    coupon_lines: Array<{
        id: number;
        code: string;
        discount: string;
        discount_tax: string;
        meta_data: Array<{
            id: number;
            key: string;
            value: string;
        }>;
    }>;
    refunds: Array<{
        id: number;
        reason: string;
        total: string;
    }>;
    payment_url: string;
    is_editable: boolean;
    needs_payment: boolean;
    needs_processing: boolean;
    date_created_gmt: string;
    date_modified_gmt: string;
    date_completed_gmt: string | null;
    date_paid_gmt: string | null;
    currency_symbol: string;
};
export type Order = {
    id: string;
    wordpressOrderId: number;
    status: WooCommerceOrder['status'];
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    total: string;
    currency: string;
    paymentMethod: string;
    paymentMethodTitle: string;
    transactionId?: string;
    lineItems: OrderLineItem[];
    billingAddress: OrderCustomer['billing'];
    shippingAddress: OrderCustomer['shipping'];
    orderKey: string;
    dateCreated: string;
    dateModified: string;
    dateCompleted?: string;
    datePaid?: string;
    customerNote?: string;
    metaData: Array<{
        key: string;
        value: any;
    }>;
    createdAt: string;
    updatedAt: string;
};
export type WebhookPayload = {
    id: number;
    action: 'created' | 'updated' | 'deleted';
    order: WooCommerceOrder;
};
export type ApiResponse<T = any> = {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
};
//# sourceMappingURL=index.d.ts.map