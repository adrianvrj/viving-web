export const ViviFactoryAbi = [
    {
        "type": "impl",
        "name": "ViviFactoryImpl",
        "interface_name": "vivifactory::IViviFactory"
    },
    {
        "type": "interface",
        "name": "vivifactory::IViviFactory",
        "items": [
            {
                "type": "function",
                "name": "create_vivi",
                "inputs": [
                    {
                        "name": "owner",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "get_vivi",
                "inputs": [
                    {
                        "name": "owner",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "state_mutability": "view"
            }
        ]
    },
    {
        "type": "constructor",
        "name": "constructor",
        "inputs": [
            {
                "name": "vivi_class_hash",
                "type": "core::starknet::class_hash::ClassHash"
            }
        ]
    },
    {
        "type": "event",
        "name": "vivifactory::ViviFactory::Event",
        "kind": "enum",
        "variants": []
    }
]