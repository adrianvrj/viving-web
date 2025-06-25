export const ViviAbi = [
    {
        "type": "impl",
        "name": "ViviImpl",
        "interface_name": "viving::IVivi"
    },
    {
        "type": "interface",
        "name": "viving::IVivi",
        "items": [
            {
                "type": "function",
                "name": "get_health_points",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::felt252"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_room",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::felt252"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_owner",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "next_room",
                "inputs": [
                    {
                        "name": "damage",
                        "type": "core::felt252"
                    },
                    {
                        "name": "heal",
                        "type": "core::felt252"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            }
        ]
    },
    {
        "type": "constructor",
        "name": "constructor",
        "inputs": [
            {
                "name": "owner",
                "type": "core::starknet::contract_address::ContractAddress"
            }
        ]
    },
    {
        "type": "event",
        "name": "viving::Vivi::Event",
        "kind": "enum",
        "variants": []
    }
]